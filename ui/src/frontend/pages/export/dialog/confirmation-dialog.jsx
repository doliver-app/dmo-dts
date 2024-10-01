// React
import { Fragment, useState } from "react";
// Mui
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  Link,
  Stack,
  Typography,
} from "@mui/material";
// Api
import { createNewJob } from "../../../api/create-new-job";
import { DRIVE_TYPES, SCOPE_TYPES } from "../../../lib/constants/rclone-api";
import { useQueryClient } from "react-query";

export function ExportConfirmationDialog({
  isOpen,
  close,
  open,
  formData,
  closeParent,
  resetParent,
  sharedDrives,
}) {
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleCloseDialog() {
    setError(false);
    close();
  }

  async function handleCreateTransferRequest() {
    setIsSubmitting(true);
    setError(null);

    try {
      await createNewJob(formData);

      queryClient.invalidateQueries(["jobs"]);

      resetParent();

      close();
      closeParent();
    } catch (err) {
      console.error(err);
      setError("An error occurred while submitting the transfer request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getDriveOwnerEmail(data) {
    if (!data) return "N/A";

    if (data.drivetype === DRIVE_TYPES.shared.id) {
      return "Shared Drive owner";
    }

    if (data.drivetype === DRIVE_TYPES.group.id) {
      return data.groupEmail ?? "N/A";
    }

    if (data.drivetype === DRIVE_TYPES.mydrive.id) {
      return data.userEmail ?? "N/A";
    }

    return "N/A";
  }

  function getBucketName(data) {
    if (!data) return "N/A";

    if (data.bucket === "new-bucket") {
      return data.bucketName ?? "N/A";
    }

    return data.bucket ?? "N/A";
  }

  function getEstimatedSize() {
    return "Unknown";
  }

  function getSourceURL(data) {
    if (!data) return "N/A";

    if (data.url) {
      return {
        type: "link",
        content: data.url,
      };
    }

    if (data.sharedDriveId) {
      const sharedDriveName = (sharedDrives ?? []).find((drive) =>
        drive.id === data.sharedDriveId
      )?.name ?? "N/A";

      return {
        type: "string",
        content: sharedDriveName,
      };
    }

    if (data.transferoption === SCOPE_TYPES.fulldrive.id) {
      if (data.drivetype === DRIVE_TYPES.mydrive.id) {
        return {
          type: "string",
          content: DRIVE_TYPES.mydrive.label,
        };
      }

      if (data.drivetype === DRIVE_TYPES.group.id) {
        return {
          type: "string",
          content: DRIVE_TYPES.group.label,
        };
      }
    }

    return {
      type: "string",
      content: "N/A",
    };
  }

  return (
    <Fragment>
      <Button
        variant="contained"
        onClick={open}
        sx={{ textTransform: "none" }}
        disableElevation
        aria-hidden={false}
      >
        Export
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleCloseDialog}
        aria-labelledby="export-confirmation-dialog-title"
        aria-describedby="export-confirmation-dialog-description"
      >
        <DialogTitle id="export-confirmation-dialog-title">
          Start transfer?
        </DialogTitle>

        <DialogContent>
          <DialogContentText id="export-confirmation-dialog-description">
            The following Drive files will be transferred to the GCS bucket
            specified below. If you are moving files, the original files will be
            deleted on Drive.
          </DialogContentText>

          <Grid
            container
            spacing={2}
            sx={{ mt: 2, width: "100%", justifyContent: "space-between" }}
            position="relative"
          >
            <Grid size={6} pr={3}>
              <ConfirmationStackItem
                mainTitle="SOURCE"
                items={[
                  {
                    title: "Drive type",
                    content: DRIVE_TYPES[formData?.drivetype]?.label ?? "N/A",
                    type: "string",
                  },
                  {
                    title: "Drive owner email",
                    content: getDriveOwnerEmail(formData),
                    type: "string",
                  },
                  {
                    title: "Source",
                    content: getSourceURL(formData).content,
                    type: getSourceURL(formData).type,
                  },
                ]}
              />
            </Grid>

            <Grid size={6} pl={3}>
              <ConfirmationStackItem
                mainTitle="DESTINATION"
                items={[
                  {
                    title: "GCS bucket",
                    content: getBucketName(formData),
                    type: "string",
                  },
                  {
                    title: "Transfer type",
                    content: SCOPE_TYPES[formData?.transferoption]?.label ??
                      "N/A",
                    type: "string",
                  },
                  {
                    title: "Estimated total size",
                    content: getEstimatedSize(formData),
                    type: "string",
                  },
                ]}
              />
            </Grid>

            <Box
              sx={{
                position: "absolute",
                content: "''",
                top: 0,
                width: "0.5px",
                height: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0, 0, 0, 0.12)",
              }}
            />
          </Grid>

          {error && (
            <Typography color="error" sx={{ mt: 4, textAlign: "center" }}>
              {error}
            </Typography>
          )}
        </DialogContent>

        <Divider />

        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            sx={{ textTransform: "none" }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateTransferRequest}
            sx={{ textTransform: "none" }}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}

/**
 * Renders a stack of confirmation items
 *
 * @param {{ mainTitle: string, items: Array<{type: 'link' | 'text', title: string, content: string}> }}
 * @returns {JSX.Element} A Stack component with confirmation items
 */
function ConfirmationStackItem({ mainTitle, items }) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ mb: 2, fontWeight: 500 }}
        color="textSecondary"
        display="block"
      >
        {mainTitle}
      </Typography>
      <Stack spacing={2}>
        {items.map((item, index) => (
          <Box key={index}>
            <Typography
              variant="body1"
              display="block"
              color="textSecondary"
              sx={{ mb: 0.5 }}
            >
              {item.title}
            </Typography>
            {item.type === "link"
              ? (
                <Link
                  href={item.content}
                  underline="hover"
                  variant="body2"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "80%",
                    display: "block",
                  }}
                  noWrap
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.content}
                </Link>
              )
              : (
                <Typography color="textPrimary" variant="body2">
                  {item.content}
                </Typography>
              )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
