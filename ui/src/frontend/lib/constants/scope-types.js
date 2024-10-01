import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import StorageIcon from '@mui/icons-material/Storage';

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
