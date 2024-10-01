// React
import { Fragment } from "react";
// Mui
import { Container, Typography } from "@mui/material";
// Components
import { ExportDialog } from "./dialog";
import { JobsTable } from "./table";
import { Header } from "../../components/header";
// Helpers
import { Helmet } from 'react-helmet-async'

export function ExportsPage() {
  return (
    <Fragment>
      <Helmet title="Exports" /> 

      <Header />

      <Container sx={{ mt: 3, mb: 2 }}>
        <ExportDialog />

        <Typography variant="h6" sx={{ mt: 3 }}>
          Transfer history
        </Typography>

        <JobsTable />
      </Container>
    </Fragment>
  );
}
