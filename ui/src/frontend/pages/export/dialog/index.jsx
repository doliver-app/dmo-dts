/* eslint-disable react-hooks/exhaustive-deps */
// React
import { forwardRef, Fragment, useEffect, useState } from "react";
// Mui
import {
  AppBar,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid2 as Grid,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Slide,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
// Icons
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
// Components
import { ExportConfirmationDialog } from "./confirmation-dialog";
// Helpers
import { useDisclosure } from "../../../hooks/use-disclosure";
import { useDebounce } from "../../../hooks/use-debounce";
import { SOURCE_TYPES } from "../../../lib/constants/source-types";
import { SCOPE_TYPES } from "../../../lib/constants/scope-types";
// Form
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
// Api
import { getBuckets } from "../../../api/get-buckets";
import { getSharedDrives } from "../../../api/get-shared-drives";
import { useQuery } from "react-query";
import { AxiosError } from "axios";
import { getGroup } from "../../../api/get-group";

const formSchema = z.object({
  // Radio for "Drive type"
  drivetype: z.enum(["mydrive", "shared", "group"]),
  // Input for "Drive owner email"
  userEmail: z.string().email().optional().or(z.literal("")),
  // Selector for "Shared Drive"
  sharedDriveId: z.string().optional().or(z.literal("")),
  // Radio for "Scope"
  transferoption: z.enum(["fulldrive", "singlefolder", "singlefile"]),
  // Input for "Source URL"
  url: z.string().url().optional().or(z.literal("")),
  // Input for "GCP project number"
  project_id: z.string().min(1, "Required"),
  // Input for "Bucket name"
  bucket: z.string().min(1, "Required"),
  // Input for "Bucket path"
  path: z.string().optional(),
  // Raio for "Transfer type"
  transfertype: z.enum(["copy", "move"]),
  // Input for notification Email
  email: z.string().email().optional().or(z.literal("")),
  // Input for the name of the new bucket
  bucketName: z.string().optional(),
  // Select for the new bucket storage class
  storageClass: z.enum(["standard", "nearline", "coldline", "archive"])
    .optional(),
  // Group E-mail
  groupEmail: z.string().email().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  // Conditional validation: Require userEmail if drivetype is 'mydrive'
  if (data.drivetype === "mydrive" && !data.userEmail) {
    ctx.addIssue({
      path: ["userEmail"],
      message: "Owner email is required for 'My Drive'",
    });
  }

  if (data.drivetype === "group" && !data.groupEmail) {
    ctx.addIssue({
      path: ["groupEmail"],
      message: "Group email is required for 'Group export'",
    });
  }

  if (!data.url) {
    if (data.transferoption === "fulldrive") {
      // Do nothing
    } else {
      ctx.addIssue({
        path: ["url"],
        message: "Required",
      });
    }
  }

  if (data.bucket === "new-bucket" && !data.bucketName) {
    ctx.addIssue({
      path: ["bucketName"],
      message: "Required",
    });
  }

  if (data.bucket === "new-bucket" && !data.storageClass) {
    ctx.addIssue({
      path: ["storageClass"],
      message: "Required",
    });
  }
});

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export function ExportDialog() {
  const [formData, setFormData] = useState(null);
  const [buckets, setBuckets] = useState([]);

  const [projectIdError, setProjectIdError] = useState(false);
  const [groupError, setGroupError] = useState(false);

  const {
    data: getSharedDrivesApi,
  } = useQuery({
    queryKey: ["shared-drives"],
    queryFn: getSharedDrives,
  });

  const sharedDrives = getSharedDrivesApi?.data ?? [];

  const { isOpen, open, close } = useDisclosure();
  const {
    isOpen: isConfirmationOpen,
    open: openConfirmation,
    close: closeConfirmation,
  } = useDisclosure();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drivetype: "shared",
      userEmail: "",
      transferoption: "fulldrive",
      url: "",
      project_id: "",
      bucket: "",
      path: "",
      transfertype: "move",
      email: "",
      groupEmail: "",
      bucketName: "",
      storageClass: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState,
    control,
    watch,
    setValue,
    clearErrors,
    reset,
  } = form;
  const { errors: formErrors, isValid: isFormValid } = formState;

  const drivetype = watch("drivetype");
  const transferoption = watch("transferoption");
  const project_id = watch("project_id");
  const bucket = watch("bucket");
  const groupEmail = watch("groupEmail");

  const debouncedProjectId = useDebounce(project_id, 1000);
  const debouncedGroupEmail = useDebounce(groupEmail, 1000);

  // Checks if group email is valid
  async function fetchGoogleGroup(group) {
    form.clearErrors("groupEmail");

    if (!group) return;

    try {
      await getGroup(group);

      setGroupError(null);
    } catch (error) {
      console.error(error);

      form.setError("groupEmail", {
        type: "required",
        message: "Invalid Group.",
      });

      setGroupError("Invalid Group.");
    }
  }

  useEffect(() => {
    fetchGoogleGroup(debouncedGroupEmail);
  }, [debouncedGroupEmail]);

  // Responsible for fetching the buckets of a project
  async function fetchProjectBuckets(project) {
    form.clearErrors("project_id");

    if (!project) return;

    try {
      const response = await getBuckets(project);

      if (!response.success) {
        throw new Error("Error fetching buckets/");
      }

      const projectBuckets = response?.data ?? [];

      form.clearErrors("project_id");

      setBuckets(projectBuckets);
      setProjectIdError(null);
    } catch (error) {
      console.error(error);
      let message = "Unknown Error";

      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || "";
        const isPermissionDenied = errorMessage.includes("denied on resource");

        if (isPermissionDenied) {
          message =
            `Permission denied for project ${debouncedProjectId}. Please check your access rights.`;

          form.setError("project_id", { type: "required", message });
        } else {
          message = `Project: ${debouncedProjectId} is invalid or not found.`;

          form.setError("project_id", { type: "required", message });
        }

        setProjectIdError(message);
      }

      setBuckets([]);
    }
  }

  useEffect(() => {
    fetchProjectBuckets(debouncedProjectId);
  }, [debouncedProjectId]);

  // Changes radio to full drive if group is checked
  useEffect(() => {
    if (drivetype === "group") {
      setValue("transferoption", "fulldrive");
    }
  }, [drivetype]);

  // Cleans group email when hidden
  useEffect(() => {
    if (drivetype !== "group") {
      setValue("groupEmail", undefined);
      clearErrors("groupEmail");
    }
  }, [drivetype]);

  // Cleans owner email when hidden
  useEffect(() => {
    if (drivetype !== "mydrive") {
      setValue("userEmail", undefined);
      clearErrors("userEmail");
    }
  }, [drivetype]);

  // Cleans URL when hidden
  useEffect(() => {
    if (transferoption === "fulldrive") {
      setValue("url", undefined);
      clearErrors("url");
    }
  }, [transferoption]);

  // Cleans new bucket inputs when hidden
  useEffect(() => {
    if (bucket !== "new-bucket") {
      setValue("bucketName", undefined);
      setValue("storageClass", undefined);

      clearErrors("bucketName");
      clearErrors("storageClass");
    }
  }, [bucket]);

  function onSubmit(values) {
    if(drivetype === "group" && groupError) {
      form.setError("groupEmail", { type: "required", message: groupError });
      return
    }
    
    if(projectIdError) {
      form.setError("project_id", { type: "required", message: projectIdError });
      return
    }

    setFormData(values);
    openConfirmation();
  }

  function resetForm() {
    reset({
      drivetype: "shared",
      userEmail: "",
      transferoption: "fulldrive",
      url: "",
      project_id: "",
      bucket: "",
      path: "",
      transfertype: "move",
      email: "",
      groupEmail: "",
      bucketName: "",
      storageClass: "",
    });
  }

  const shouldHideSourceUrl = drivetype === "group" ||
    transferoption === "fulldrive";

  const sourceUrlLabel = transferoption === "singlefolder"
    ? "Google Drive folder URL"
    : transferoption === "singlefile"
    ? "Google Drive file URL"
    : "Google Drive URL";

  return (
    <Fragment>
      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={open}
        sx={{ textTransform: "none", borderRadius: 5 }}
        aria-hidden="false"
      >
        Start transfer
      </Button>
      <Dialog
        fullScreen
        open={isOpen}
        onClose={close}
        TransitionComponent={Transition}
      >
        <AppBar color="transparent" elevation={0} position="relative">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={close}
              aria-label="Close new export dialog"
            >
              <CloseIcon color="action" />
            </IconButton>
            <Typography
              sx={{ ml: 2 }}
              variant="h6"
              component="span"
              color="textSecondary"
            >
              Start a transfer
            </Typography>
          </Toolbar>
        </AppBar>

        <Divider />

        <DialogContent sx={{ pt: 3, pb: 0 }}>
          <Container
            as="form"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              px: 2,
              pt: 4,
              pb: 10,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              borderTop: 1,
              borderLeft: 1,
              borderRight: 1,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              borderColor: "rgba(0, 0, 0, 0.12)",
            }}
          >
            {/* Source */}
            <Grid container spacing={2}>
              <FormSectionTitle title="Source" />

              <Grid
                size={8}
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
                <FormSectionSubtitle title="Choose what data you want to transfer to Google Cloud Storage." />

                <FormControl fullWidth>
                  <FormLabel id="drivetype" sx={{ mb: 1 }}>
                    Select Drive type
                  </FormLabel>

                  <Controller
                    name="drivetype"
                    control={control}
                    defaultValue="shared"
                    render={({ field: { name, onChange, value } }) => (
                      <RadioGroup
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                        aria-labelledby={name}
                        onChange={onChange}
                        name={name}
                        value={value}
                      >
                        {Object.values(SOURCE_TYPES).map((source) => (
                          <FormControlLabel
                            key={source.id}
                            value={source.id}
                            control={<Radio sx={{ mt: -3, ml: 1 }} />}
                            label={
                              <FormRadioCustomLabel
                                title={source.label}
                                subtitle={source.description}
                              />
                            }
                          />
                        ))}
                      </RadioGroup>
                    )}
                  />
                </FormControl>

                <FormControl fullWidth>
                  <FormLabel id="scope-type" sx={{ mb: 1 }}>
                    Select scope
                  </FormLabel>

                  <Controller
                    name="transferoption"
                    control={control}
                    defaultValue="fulldrive"
                    render={({ field: { name, onChange, value } }) => (
                      <RadioGroup
                        aria-labelledby={name}
                        onChange={onChange}
                        name={name}
                        value={value}
                      >
                        {Object.values(SCOPE_TYPES).map((source) => (
                          <FormControlLabel
                            disabled={source.id !== "fulldrive" &&
                              drivetype === "group"}
                            key={source.id}
                            value={source.id}
                            control={<Radio sx={{ ml: 1 }} />}
                            label={
                              <FormRadioCustomLabel title={source.label} />
                            }
                          />
                        ))}
                      </RadioGroup>
                    )}
                  />
                </FormControl>

                <FormControl fullWidth>
                  <FormLabel id="drive-type" sx={{ mb: 1 }}>
                    Enter source
                  </FormLabel>

                  {drivetype === "group" && (
                    <TextField
                      margin="dense"
                      label="Google Group email"
                      variant="outlined"
                      {...register("groupEmail")}
                      error={!!formErrors.groupEmail}
                      helperText={formErrors.groupEmail?.message}
                    />
                  )}

                  {drivetype === "mydrive" && (
                    <TextField
                      margin="dense"
                      label="Drive owner email"
                      variant="outlined"
                      {...register("userEmail")}
                      error={!!formErrors.userEmail}
                      helperText={formErrors.userEmail?.message}
                    />
                  )}

                  {drivetype === "shared"
                    ? (
                      <Controller
                        name="sharedDriveId"
                        control={control}
                        render={({ field: { name, onChange, value } }) => (
                          <FormControl fullWidth sx={{ mt: 1, mb: 0.5 }}>
                            <InputLabel id={name} error={!!formErrors.bucket}>
                              Select Shared Drive
                            </InputLabel>
                            <Select
                              name={name}
                              labelId={name}
                              id={`${name}-select`}
                              value={value}
                              label="Select Shared Drive "
                              onChange={onChange}
                              error={!!formErrors.bucket}
                            >
                              {sharedDrives.map((item) => (
                                <MenuItem key={item.id} value={item.id}>
                                  {item.name}
                                </MenuItem>
                              ))}
                            </Select>

                            {formErrors.bucket?.message && (
                              <FormHelperText error={!!formErrors.bucket}>
                                {formErrors.bucket?.message}
                              </FormHelperText>
                            )}
                          </FormControl>
                        )}
                      />
                    )
                    : undefined}

                  {!shouldHideSourceUrl
                    ? (
                      <TextField
                        margin="dense"
                        label={sourceUrlLabel}
                        variant="outlined"
                        {...register("url")}
                        error={!!formErrors.url}
                        helperText={formErrors.url?.message}
                      />
                    )
                    : undefined}
                </FormControl>
              </Grid>

              <Grid size={2} />
            </Grid>

            {/* Destination */}
            <Grid container spacing={2}>
              <FormSectionTitle title="Destination" />

              <Grid
                size={8}
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
                <FormSectionSubtitle
                  title="Choose which Google Cloud storage bucket data should be transfered to."
                  link="Learn more about choosing a bucket"
                  linkHref="#"
                />

                <FormControl fullWidth>
                  <TextField
                    margin="dense"
                    label="GCP project ID"
                    variant="outlined"
                    {...register("project_id")}
                    error={!!formErrors.project_id}
                    helperText={formErrors.project_id?.message}
                  />

                  <Controller
                    name="bucket"
                    control={control}
                    defaultValue=""
                    render={({ field: { name, onChange, value } }) => (
                      <FormControl fullWidth sx={{ mt: 1, mb: 0.5 }}>
                        <InputLabel id={name} error={!!formErrors.bucket}>
                          Bucket
                        </InputLabel>
                        <Select
                          name={name}
                          labelId={name}
                          id={`${name}-select`}
                          value={value}
                          label="Bucket"
                          onChange={onChange}
                          error={!!formErrors.bucket}
                        >
                          <MenuItem value="new-bucket">New bucket</MenuItem>
                          {buckets.map((bucketName) => (
                            <MenuItem key={bucketName} value={bucketName}>
                              {bucketName}
                            </MenuItem>
                          ))}
                        </Select>

                        {formErrors.bucket?.message && (
                          <FormHelperText error={!!formErrors.bucket}>
                            {formErrors.bucket?.message}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />

                  {bucket === "new-bucket" && (
                    <>
                      <TextField
                        margin="dense"
                        label="New Bucket name"
                        variant="outlined"
                        {...register("bucketName")}
                        error={!!formErrors.bucketName}
                        helperText={formErrors.bucketName?.message}
                      />

                      <Controller
                        name="storageClass"
                        control={control}
                        defaultValue="standard"
                        render={({ field: { name, onChange, value } }) => (
                          <FormControl fullWidth sx={{ mt: 1, mb: 0.5 }}>
                            <InputLabel
                              id={name}
                              error={!!formErrors.storageClass}
                            >
                              Storage class
                            </InputLabel>
                            <Select
                              name={name}
                              labelId={name}
                              id={`${name}-select`}
                              value={value}
                              label="Storage class"
                              onChange={onChange}
                              error={!!formErrors.storageClass}
                            >
                              <MenuItem value="standard">Standard</MenuItem>
                              <MenuItem value="nearline">Near Line</MenuItem>
                              <MenuItem value="coldline">Cold Line</MenuItem>
                              <MenuItem value="archive">Archive</MenuItem>
                            </Select>

                            {formErrors.storageClass?.message && (
                              <FormHelperText error={!!formErrors.storageClass}>
                                {formErrors.storageClass?.message}
                              </FormHelperText>
                            )}
                          </FormControl>
                        )}
                      />
                    </>
                  )}
                  <TextField
                    margin="dense"
                    label="Bucket path (optional)"
                    variant="outlined"
                    {...register("path")}
                    error={!!formErrors.path}
                    helperText={formErrors.path?.message}
                  />
                </FormControl>
              </Grid>

              <Grid size={2} />
            </Grid>

            {/* Transfer details */}
            <Grid container spacing={2}>
              <FormSectionTitle title="Transfer details" />

              <Grid
                size={8}
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
                <FormSectionSubtitle title="Configure your transfer settings." />

                <FormControl fullWidth>
                  <FormLabel id="transfer-type" sx={{ mb: 1 }}>
                    Select transfer type
                  </FormLabel>

                  <Controller
                    name="transfertype"
                    control={control}
                    defaultValue="move"
                    render={({ field: { name, onChange, value } }) => (
                      <RadioGroup
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                        aria-labelledby={name}
                        onChange={onChange}
                        name={name}
                        value={value}
                      >
                        <FormControlLabel
                          value="move"
                          control={<Radio sx={{ mt: -3, ml: 1 }} />}
                          label={
                            <FormRadioCustomLabel
                              title="Move"
                              subtitle="Move and delete original Drive object"
                            />
                          }
                        />
                        <FormControlLabel
                          value="copy"
                          control={<Radio sx={{ mt: -3, ml: 1 }} />}
                          label={
                            <FormRadioCustomLabel
                              title="Copy"
                              subtitle="Move and retain original Drive object"
                            />
                          }
                        />
                      </RadioGroup>
                    )}
                  />
                </FormControl>

                <FormControl fullWidth>
                  <FormLabel id="notification-emmail" sx={{ mb: 1 }}>
                    Additional emails for notification
                  </FormLabel>

                  <TextField
                    margin="dense"
                    label="Email address"
                    variant="outlined"
                    fullWidth
                    {...register("email")}
                    error={!!formErrors.email}
                    helperText={formErrors.email?.message}
                  />
                </FormControl>
              </Grid>

              <Grid size={2} />
            </Grid>
          </Container>
        </DialogContent>

        <Divider />

        <DialogActions>
          <Container
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 1,
            }}
          >
            <Button
              variant="text"
              sx={{ textTransform: "none" }}
              onClick={resetForm}
            >
              Reset form
            </Button>

            <ExportConfirmationDialog
              active={isFormValid}
              isOpen={isConfirmationOpen}
              open={handleSubmit(onSubmit)}
              close={closeConfirmation}
              formData={formData}
              closeParent={close}
              resetParent={resetForm}
              sharedDrives={sharedDrives}
            />
          </Container>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}

function FormSectionTitle({ title }) {
  return (
    <Grid size={2}>
      <Typography variant="h6" component="span" lineHeight={1}>
        {title}
      </Typography>
    </Grid>
  );
}

function FormSectionSubtitle({ title, link, linkHref }) {
  return (
    <Box>
      <Typography variant="body1" component="p">
        {title}
      </Typography>
      {link && (
        <Link underline="hover" href={linkHref}>
          {link}
        </Link>
      )}
    </Box>
  );
}

function FormRadioCustomLabel({ title, subtitle }) {
  return (
    <Box>
      <Typography variant="body1" component="p">
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary" component="span">
        {subtitle}
      </Typography>
    </Box>
  );
}
