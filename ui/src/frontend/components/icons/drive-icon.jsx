import { useTheme } from '@mui/material/styles';

export function DriveIcon({ color = 'action', className = '', size = 24, ...props }) {
  const theme = useTheme();

  const getColor = () => {
    if (color in theme.palette) {
      return theme.palette[color].main ? theme.palette[color].main : theme.palette[color].active;
    }
    return color;
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      id="mdi-google-drive"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={getColor()}
      className={className}
      {...props}
    >
      <path d="M7.71,3.5L1.15,15L4.58,21L11.13,9.5M9.73,15L6.3,21H19.42L22.85,15M22.28,14L15.42,2H8.58L8.57,2L15.43,14H22.28Z" />
    </svg>
  );
}
