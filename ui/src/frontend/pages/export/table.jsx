// React
import { useState } from "react";
// Mui
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FolderOpen, Group } from "@mui/icons-material";
// Icons
import {
  ErrorOutline as ErrorOutlineIcon,
  FirstPage as FirstPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  LastPage as LastPageIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
// Query
import { useQuery } from "react-query";
import { getJobs } from "../../api/get-jobs";
// Contants
import { JOB_STATUSES } from "../../lib/constants/rclone-api";
// Utils
import moment from "moment";
import { safeUppercaseFirstLetter } from "../../lib/utils";
import { DriveIcon } from "../../components/icons/drive-icon";

function getReadableSourceName(sourceName) {
  if(!sourceName) return "N/A";
  
  return sourceName.split("|").join(" ").replace("(Full Drive)", "Drive").replace("(Subfolder)", "folder");
}

function getIconBySourceName(sourceName) {
  if(!sourceName) return "N/A";

  if (sourceName.includes("Full Drive")) {
    return DriveIcon;
  }

  if(sourceName.startsWith("Group")) {
    return Group
  }

  return FolderOpen;
}

export function JobsTable() {
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [page, setPage] = useState(0);

  const {
    data: jobsApi,
    isLoading: isJobsLoading,
    isError: isJobsError,
    refetch,
    isRefetching: isJobsRefetching,
  } = useQuery({
    queryFn: () => getJobs({ itemsPerPage, page: page + 1 }),
    queryKey: ["jobs", page, itemsPerPage],
  });

  const JOBS_LIST = jobsApi?.data?.rows ?? [];
  const TOTAL_ROWS = jobsApi?.data?.totalRows ?? 0;
  const CURRENT_PAGE = jobsApi?.data?.currentPage ?? 0;
  const TOTAL_PAGES = jobsApi?.data?.totalPages ?? 0;

  function handleChangeItemsPerPage(event) {
    setItemsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Height of table items times the quantity of items per page
   * + Table header height
   * + Table footer size
   */
  const clsHeight = (itemsPerPage * 44.5) + 38 + 51;

  if (isJobsLoading) {
    return (
      <Box
        sx={{
          mt: 3,
          minWidth: 650,
          height: clsHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isJobsError) {
    return (
      <Paper
        sx={{
          mt: 3,
          width: "100%",
          height: clsHeight,
          py: 8,
          px: 4,
          border: 1,
          borderColor: "rgba(0, 0, 0, 0.12)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
        elevation={0}
      >
        <ErrorOutlineIcon color="error" sx={{ fontSize: 50, mb: 2 }} />

        <Typography variant="h5" color="error" gutterBottom>
          Error Loading Jobs
        </Typography>

        <Typography
          variant="body1"
          color="textSecondary"
          align="center"
          sx={{ mb: 3 }}
        >
          We encountered an issue while fetching the job list.
        </Typography>

        <Button
          variant="contained"
          onClick={() => refetch()}
          disabled={isJobsRefetching}
          startIcon={<RefreshIcon />}
        >
          Try Again
        </Button>
      </Paper>
    );
  }

  if (!JOBS_LIST || JOBS_LIST.length === 0) {
    return (
      <Paper
        sx={{
          mt: 3,
          width: "100%",
          height: "100%",
          py: 16,
          px: 4,
          border: 1,
          borderColor: "rgba(0, 0, 0, 0.12)",
        }}
        elevation={0}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            maxWidth: 400,
            margin: "0 auto",
          }}
        >
          <img src="/jobs-empty-state.png" height="160" width="256" />
          <Typography
            variant="h5"
            color="textSecondary"
            textAlign="center"
            sx={{ mt: 6 }}
          >
            Start your first transfer
          </Typography>
          <Typography
            variant="body1"
            color="textPrimary"
            textAlign="center"
            sx={{ mt: 1 }}
          >
            You can transfer Drive files to specific Google Cloud Storage
            buckets
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = CURRENT_PAGE === TOTAL_PAGES
    ? itemsPerPage - JOBS_LIST.length
    : 0;

  return (
    <TableContainer sx={{ mt: 3 }}>
      <Table
        size="small"
        sx={{ minWidth: 650 }}
        aria-label="Google Drive file transfer history"
      >
        <TableHead>
          <TableRow
            sx={{ "th": { border: "none", color: "rgba(0, 0, 0, 0.6)" } }}
          >
            <TableCell sx={{ width: "420px" }}>Source</TableCell>
            <TableCell sx={{ width: "200px" }}>Destination</TableCell>
            <TableCell sx={{ width: "82px" }}>Size</TableCell>
            <TableCell sx={{ width: "110px" }}>Export type</TableCell>
            <TableCell sx={{ width: "112px" }}>Date started</TableCell>
            <TableCell sx={{ width: "130px" }}>Date complete</TableCell>
            <TableCell sx={{ width: "100px" }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody
          sx={{
            boxShadow: "inset 0 0 0 1px rgba(224, 224, 224, 1);",
            borderRadius: 2,
          }}
        >
          {JOBS_LIST.map((row, index) => {
            const Icon = getIconBySourceName(row.src_name);

            return (
              <TableRow
                key={`${row.dst_name}-${index}-${page}`}
                sx={{
                  "&:last-child td, &:last-child th": {
                    border: 0,
                  },
                }}
              >
                <TableCell>
                  <Box alignItems="center" display="flex">
                    <Icon color="action" style={{ marginRight: "8px" }} />
                    <Tooltip
                      title={getReadableSourceName(row.src_name)}
                    >
                      <Box
                        sx={{
                          cursor: "default",
                          maxWidth: "350px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {getReadableSourceName(row.src_name)}
                      </Box>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    cursor: "default",
                    maxWidth: "200px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <Tooltip title={row.dst_name}>
                    <span>{row.dst_name}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>Unknown</TableCell>
                <TableCell>{safeUppercaseFirstLetter(row.job_type)}</TableCell>
                <TableCell>
                  {row.job_started
                    ? moment(row.job_started).format("L")
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {row.job_completed
                    ? moment(row.job_completed).format("L")
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Chip
                    sx={{
                      bgcolor: JOB_STATUSES?.[row.status]?.bg ??
                        JOB_STATUSES.unknown.bg,
                      color: JOB_STATUSES?.[row.status]?.color ??
                        JOB_STATUSES.unknown.color,
                      fontWeight: 500,
                    }}
                    variant="filled"
                    label={JOB_STATUSES?.[row.status]?.label ??
                      JOB_STATUSES.unknown.label}
                  />
                </TableCell>
              </TableRow>
            );
          })}

          {emptyRows > 0 && (
            <TableRow key="empty" sx={{ height: 53 * emptyRows }}>
              <TableCell colSpan={12} sx={{ border: "none !important" }} />
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow sx={{ "td": { border: "none" } }}>
            <TablePagination
              colSpan={12}
              rowsPerPage={itemsPerPage ?? 10}
              rowsPerPageOptions={[5, 10, 25]}
              count={TOTAL_ROWS}
              page={page ?? 1}
              slotProps={{
                select: {
                  inputProps: {
                    "aria-label": "rows per page",
                  },
                  native: true,
                },
              }}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeItemsPerPage}
              ActionsComponent={TablePaginationActions}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}

function TablePaginationActions(props) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === "rtl" ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === "rtl"
          ? <KeyboardArrowRight />
          : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === "rtl"
          ? <KeyboardArrowLeft />
          : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === "rtl" ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}
