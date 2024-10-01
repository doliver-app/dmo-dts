import { AppBar, Box, Divider, Toolbar, IconButton, Menu, MenuItem } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import { useState } from 'react';

import { useAuth } from "../../hooks/use-auth"

export function Header() {
  const { signOut } = useAuth()
  const [anchorEl, setAnchorEl] = useState(null);

  function handleClick(event) {
    setAnchorEl(event.currentTarget);
  };

  function handleClose() {
    setAnchorEl(null);
  };

  async function handleSignOut() {
    await signOut()
  }

  return (
    <>
      <AppBar
        color="transparent"
        elevation={0}
        position="static"
      >
        <Box>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <img
              width={120}
              src="/cloud-logo.svg"
            />
            <IconButton
              color="default"
              onClick={handleClick}
              aria-controls="settings-menu"
              aria-haspopup="true"
              aria-label="Open settings Menu"
            >
              <SettingsIcon aria-label="Cog icon" />
            </IconButton>
            <Menu
              id="settings-menu"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
            </Menu>
          </Toolbar>
        </Box>
      </AppBar>

      <Divider />
    </>
  );
}
