import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router";

function DashboardPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/login");
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h4" gutterBottom>
            Dwaar Sewa Admin Dashboard
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Admin panel setup is working.
          </Typography>

          <Button variant="contained" color="error" onClick={handleLogout}>
            Logout
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

export default DashboardPage;
