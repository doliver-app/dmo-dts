import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import StorageIcon from '@mui/icons-material/Storage';

export const JOB_STATUSES = {
  complete: {
    id: "complete",
    label: "Complete",
    bg: "#E6F4EA",
    color: "#188038"
  },
  pending: {
    id: "pending",
    label: "Pending",
    bg: "#FEF7E0",
    color: "#5F6368"
  },
  error: {
    id: "error",
    label: "Error",
    bg: "#FCE8E6",
    color: "#C5221F"
  },
  running: {
    id: "running",
    label: "Running",
    bg: "#E8F0FE",
    color: "#1967D2"
  },
  unknown: {
    id: "unknown",
    label: "Unknown",
    bg: "#333",
    color: "#fefefe"
  }
}

export const DRIVE_TYPES = {
  shared: {
    id: "shared",
    label: "Shared Drive",
    description: "Transfer from a Shared Drive.",
  }, 
  mydrive: {
    id: "mydrive",
    label: "My Drive",
    description: "Transfer from your storage or another person's within your organization.",
  }, 
  group: {
    id: "group",
    label: "Google Group transfer",
    description: "Transfer all 'My Drive' content belonging to the accounts in a designated Google Group. Google Groups cannot exceed 20 accounts.",
  }
}

export const SCOPE_TYPES = {
  fulldrive: {
    id: "fulldrive",
    label: "Full Drive transfer",
    description: "Transfer the entire drive content.",
    icon: StorageIcon,
  },
  singlefolder: {
    id: "singlefolder",
    label: "Single Folder transfer",
    description: "Transfer a specific folder and its contents.",
    icon: FolderIcon,
  },
  singlefile: {
    id: "singlefile",
    label: "Single File transfer",
    description: "Transfer an individual file.",
    icon: InsertDriveFileIcon,
  }
}