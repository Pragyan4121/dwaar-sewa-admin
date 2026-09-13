import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Rating,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Close,
  RateReview,
  Refresh,
  Search,
  Star,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import { clearAdminSession } from "../api/session";
import AdminLayout from "../layouts/AdminLayout";

type RatingFilter = "all" | "1" | "2" | "3" | "4" | "5";

type VisibilityFilter = "all" | "visible" | "hidden";

interface UserSummary {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
}

interface ServiceSummary {
  id: number;
  name: string;
}

interface ReviewBooking {
  id: number;
  status: string;
  service_id: number;
  service_address: string;
  service_area: string;
  completed_at: string | null;
  created_at: string;
  service: ServiceSummary | null;
}

interface Review {
  id: number;
  booking_id: number;
  customer_id: number;
  provider_id: number;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  customer: UserSummary | null;
  provider: UserSummary | null;
  booking: ReviewBooking | null;
}

interface ReviewSummary {
  total: number;
  visible: number;
  hidden: number;
  average_rating: number;

  rating_counts: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

interface ReviewsResponse {
  message: string;
  reviews: Review[];
  summary: ReviewSummary;
  pagination: PaginationData;
}

interface ReviewDetailBooking {
  id: number;
  status: string;
  service_id: number;
  service_address: string;
  service_area: string;
  preferred_date: string;
  preferred_time: string | null;
  estimated_price: string;
  final_price: string | null;
  completed_at: string | null;
  created_at: string;

  service: {
    id: number;
    name: string;
    description: string | null;
    base_price: string;
  } | null;
}

interface ReviewDetail extends Omit<Review, "booking"> {
  customer:
    | (UserSummary & {
        created_at: string;
      })
    | null;

  provider:
    | (UserSummary & {
        created_at: string;
      })
    | null;

  booking: ReviewDetailBooking | null;
}

interface ReviewDetailResponse {
  message: string;
  review: ReviewDetail;
}

const initialSummary: ReviewSummary = {
  total: 0,
  visible: 0,
  hidden: 0,
  average_rating: 0,

  rating_counts: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  },
};

const initialPagination: PaginationData = {
  page: 1,
  limit: 20,
  total_records: 0,
  total_pages: 0,
  has_next_page: false,
  has_previous_page: false,
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
};

const formatLabel = (value: string) => {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatMoney = (value: string | number) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "NPR 0.00";
  }

  return `NPR ${numberValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getInitials = (name?: string | null) => {
  if (!name) {
    return "?";
  }

  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

function VisibilityChip({ isVisible }: { isVisible: boolean }) {
  return (
    <Chip
      label={isVisible ? "Visible" : "Hidden"}
      size="small"
      icon={
        isVisible ? (
          <Visibility sx={{ fontSize: "15px !important" }} />
        ) : (
          <VisibilityOff sx={{ fontSize: "15px !important" }} />
        )
      }
      sx={{
        height: 27,
        borderRadius: 2,
        fontSize: 11,
        fontWeight: 750,

        color: isVisible ? "#15803d" : "#64748b",

        bgcolor: isVisible ? "#f0fdf4" : "#f1f5f9",

        border: isVisible ? "1px solid #bbf7d0" : "1px solid #e2e8f0",

        "& .MuiChip-icon": {
          color: "inherit",
        },
      }}
    />
  );
}

function ReviewsPage() {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<Review[]>([]);

  const [summary, setSummary] = useState<ReviewSummary>(initialSummary);

  const [pagination, setPagination] =
    useState<PaginationData>(initialPagination);

  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");

  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  const [isLoading, setIsLoading] = useState(true);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<
    number | null
  >(null);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const [reviewDetail, setReviewDetail] = useState<ReviewDetail | null>(null);

  const handleAuthenticationError = useCallback(
    (status?: number) => {
      if (status === 401 || status === 403) {
        clearAdminSession();

        navigate("/login");

        return true;
      }

      return false;
    },
    [navigate],
  );

  const getApiErrorMessage = useCallback(
    (error: unknown, fallbackMessage: string): string | null => {
      if (typeof error === "object" && error !== null && "response" in error) {
        const apiError = error as {
          response?: {
            status?: number;

            data?: {
              message?: string;
            };
          };
        };

        if (handleAuthenticationError(apiError.response?.status)) {
          return null;
        }

        return apiError.response?.data?.message || fallbackMessage;
      }

      return fallbackMessage;
    },
    [handleAuthenticationError],
  );

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const parameters = new URLSearchParams();

      parameters.set("page", String(page));
      parameters.set("limit", "20");
      parameters.set("rating", ratingFilter);
      parameters.set("visibility", visibilityFilter);

      if (appliedSearch) {
        parameters.set("search", appliedSearch);
      }

      const response = await api.get<ReviewsResponse>(
        `/api/admin/reviews?${parameters.toString()}`,
      );

      setReviews(response.data.reviews);
      setSummary(response.data.summary);
      setPagination(response.data.pagination);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load reviews.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, appliedSearch, ratingFilter, visibilityFilter, getApiErrorMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchReviews();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchReviews]);

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setRatingFilter("all");
    setVisibilityFilter("all");
    setPage(1);
  };

  const handleOpenDetails = async (review: Review) => {
    setSelectedReview(review);
    setReviewDetail(null);
    setDetailDialogOpen(true);
    setIsLoadingDetail(true);
    setErrorMessage("");

    try {
      const response = await api.get<ReviewDetailResponse>(
        `/api/admin/reviews/${review.id}`,
      );

      setReviewDetail(response.data.review);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load review details.",
      );

      if (message) {
        setErrorMessage(message);
      }

      setDetailDialogOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleToggleVisibility = async (review: Review) => {
    setVisibilityUpdatingId(review.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(`/api/admin/reviews/${review.id}/visibility`, {
        isVisible: !review.is_visible,
      });

      setSuccessMessage(
        review.is_visible
          ? "Review hidden successfully."
          : "Review made visible successfully.",
      );

      await fetchReviews();
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not update review visibility.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setVisibilityUpdatingId(null);
    }
  };

  const hasActiveFilters =
    Boolean(appliedSearch) ||
    ratingFilter !== "all" ||
    visibilityFilter !== "all";

  const summaryCards = [
    {
      label: "Total Reviews",
      value: summary.total,
      color: "#2563eb",
      background: "#eff6ff",
    },

    {
      label: "Average Rating",
      value: Number(summary.average_rating).toFixed(1),
      color: "#d97706",
      background: "#fffbeb",
    },

    {
      label: "Visible Reviews",
      value: summary.visible,
      color: "#15803d",
      background: "#f0fdf4",
    },

    {
      label: "Hidden Reviews",
      value: summary.hidden,
      color: "#64748b",
      background: "#f1f5f9",
    },
  ];

  return (
    <AdminLayout title="Reviews">
      {/* HEADER */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: {
            xs: "column",
            md: "row",
          },
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            md: "center",
          },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: {
                xs: 26,
                md: 30,
              },
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.035em",
            }}
          >
            Review Management
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Monitor customer feedback and control public review visibility.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => void fetchReviews()}
          disabled={isLoading}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#334155",
            borderColor: "#e2e8f0",
            bgcolor: "#ffffff",

            "&:hover": {
              borderColor: "#cbd5e1",
              bgcolor: "#f8fafc",
            },
          }}
        >
          Refresh reviews
        </Button>
      </Box>

      {errorMessage && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 3,
          }}
          onClose={() => setErrorMessage("")}
        >
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert
          severity="success"
          sx={{
            mb: 3,
            borderRadius: 3,
          }}
          onClose={() => setSuccessMessage("")}
        >
          {successMessage}
        </Alert>
      )}

      {/* SUMMARY */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1.5,
          mb: 3,
        }}
      >
        {summaryCards.map((item) => (
          <Paper
            key={item.label}
            elevation={0}
            sx={{
              p: 2.3,
              minHeight: 125,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              position: "relative",
              overflow: "hidden",
              transition: "transform 180ms ease, box-shadow 180ms ease",

              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 12px 26px rgba(15,23,42,0.07)",
              },
            }}
          >
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 4,
                height: "100%",
                bgcolor: item.color,
              }}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 10.5,
                    fontWeight: 750,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.055em",
                  }}
                >
                  {item.label}
                </Typography>

                <Typography
                  sx={{
                    mt: 1.2,
                    fontSize: 30,
                    lineHeight: 1,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {item.value}
                </Typography>

                {item.label === "Average Rating" && (
                  <Rating
                    value={Number(summary.average_rating)}
                    precision={0.1}
                    readOnly
                    size="small"
                    sx={{
                      mt: 1,
                    }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  borderRadius: 2.5,
                  bgcolor: item.background,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {item.label === "Average Rating" ? (
                  <Star
                    sx={{
                      color: item.color,
                      fontSize: 21,
                    }}
                  />
                ) : (
                  <RateReview
                    sx={{
                      color: item.color,
                      fontSize: 21,
                    }}
                  />
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* RATING DISTRIBUTION */}
      <Paper
        elevation={0}
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },
          mb: 3,
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
        }}
      >
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Rating Distribution
        </Typography>

        <Typography
          sx={{
            mt: 0.2,
            mb: 2,
            fontSize: 12,
            color: "#64748b",
          }}
        >
          Review count by rating score.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(5, 1fr)",
            },
            gap: 1.2,
          }}
        >
          {[5, 4, 3, 2, 1].map((rating) => {
            const count =
              summary.rating_counts[
                rating as keyof ReviewSummary["rating_counts"]
              ];

            const percentage =
              summary.total > 0 ? (count / summary.total) * 100 : 0;

            return (
              <Box
                key={rating}
                sx={{
                  p: 1.6,
                  borderRadius: 2.5,
                  bgcolor: "#f8fafc",
                  border: "1px solid #f1f5f9",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Star
                    sx={{
                      fontSize: 16,
                      color: "#f59e0b",
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#334155",
                    }}
                  >
                    {rating}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    mt: 0.7,
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {count}
                </Typography>

                <Box
                  sx={{
                    mt: 1,
                    width: "100%",
                    height: 5,
                    borderRadius: 999,
                    bgcolor: "#e2e8f0",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${Math.min(Math.max(percentage, 0), 100)}%`,
                      borderRadius: 999,
                      bgcolor: "#f59e0b",
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* FILTERS */}
      <Paper
        elevation={0}
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },
          mb: 2.5,
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
        }}
      >
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Search & filters
            </Typography>

            <Typography
              sx={{
                mt: 0.2,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Search customer, provider, service or comment.
            </Typography>
          </Box>

          {hasActiveFilters && (
            <Button
              size="small"
              onClick={handleClearFilters}
              sx={{
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Clear all
            </Button>
          )}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(280px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr) auto",
            },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            label="Search reviews"
            placeholder="Customer, provider, service or comment"
            size="small"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    sx={{
                      mr: 1,
                      fontSize: 20,
                      color: "#94a3b8",
                    }}
                  />
                ),
              },
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel id="review-rating-label">Rating</InputLabel>

            <Select
              labelId="review-rating-label"
              label="Rating"
              value={ratingFilter}
              onChange={(event) => {
                setRatingFilter(event.target.value as RatingFilter);

                setPage(1);
              }}
            >
              <MenuItem value="all">All Ratings</MenuItem>

              <MenuItem value="5">5 Stars</MenuItem>

              <MenuItem value="4">4 Stars</MenuItem>

              <MenuItem value="3">3 Stars</MenuItem>

              <MenuItem value="2">2 Stars</MenuItem>

              <MenuItem value="1">1 Star</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="review-visibility-label">Visibility</InputLabel>

            <Select
              labelId="review-visibility-label"
              label="Visibility"
              value={visibilityFilter}
              onChange={(event) => {
                setVisibilityFilter(event.target.value as VisibilityFilter);

                setPage(1);
              }}
            >
              <MenuItem value="all">All Reviews</MenuItem>

              <MenuItem value="visible">Visible</MenuItem>

              <MenuItem value="hidden">Hidden</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={handleSearch}
            sx={{
              px: 2.3,
              minHeight: 40,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
              whiteSpace: "nowrap",

              "&:hover": {
                boxShadow: "none",
              },
            }}
          >
            Search
          </Button>
        </Box>

        <Typography
          sx={{
            mt: 1.8,
            fontSize: 11.5,
            color: "#64748b",
            textAlign: {
              xs: "left",
              md: "right",
            },
          }}
        >
          {pagination.total_records} review
          {pagination.total_records === 1 ? "" : "s"} found
        </Typography>
      </Paper>

      {/* TABLE */}
      {isLoading ? (
        <Box
          sx={{
            minHeight: 350,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
          <CircularProgress size={34} />

          <Typography
            sx={{
              fontSize: 13,
              color: "#64748b",
            }}
          >
            Loading reviews...
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3.5,
              overflowX: "auto",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",

              "& .MuiTableCell-head": {
                bgcolor: "#f8fafc",
                color: "#475569",
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.045em",
                borderBottom: "1px solid #e2e8f0",
                whiteSpace: "nowrap",
              },

              "& .MuiTableCell-body": {
                borderBottom: "1px solid #f1f5f9",
                py: 1.7,
              },
            }}
          >
            <Table sx={{ minWidth: 1250 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Review</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Comment</TableCell>
                  <TableCell>Visibility</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {reviews.map((review) => (
                  <TableRow
                    key={review.id}
                    hover
                    sx={{
                      "&:hover": {
                        bgcolor: "#f8fafc",
                      },
                    }}
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        #{review.id}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.25,
                          fontSize: 10.5,
                          color: "#94a3b8",
                        }}
                      >
                        Booking #{review.booking_id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: "#dbeafe",
                            color: "#1d4ed8",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {getInitials(review.customer?.full_name)}
                        </Avatar>

                        <Box>
                          <Typography
                            sx={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "#334155",
                            }}
                          >
                            {review.customer?.full_name || "Unknown customer"}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 10.5,
                              color: "#64748b",
                            }}
                          >
                            {review.customer?.phone || "—"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: "#dcfce7",
                            color: "#15803d",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {getInitials(review.provider?.full_name)}
                        </Avatar>

                        <Box>
                          <Typography
                            sx={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "#334155",
                            }}
                          >
                            {review.provider?.full_name || "Unknown provider"}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 10.5,
                              color: "#64748b",
                            }}
                          >
                            {review.provider?.phone || "—"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 650,
                          color: "#334155",
                        }}
                      >
                        {review.booking?.service?.name || "Unknown service"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.8,
                        }}
                      >
                        <Rating value={review.rating} readOnly size="small" />

                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#334155",
                          }}
                        >
                          {review.rating}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell
                      sx={{
                        maxWidth: 300,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: review.comment ? "#475569" : "#94a3b8",

                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {review.comment || "No comment"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <VisibilityChip isVisible={review.is_visible} />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          maxWidth: 120,
                          fontSize: 10.5,
                          color: "#64748b",
                        }}
                      >
                        {formatDate(review.created_at)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: 0.7,
                        }}
                      >
                        <Tooltip title="View review">
                          <IconButton
                            size="small"
                            onClick={() => void handleOpenDetails(review)}
                            sx={{
                              border: "1px solid #e2e8f0",
                              borderRadius: 2,
                              color: "#475569",

                              "&:hover": {
                                bgcolor: "#f1f5f9",
                              },
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip
                          title={
                            review.is_visible ? "Hide review" : "Show review"
                          }
                        >
                          <span>
                            <Switch
                              checked={review.is_visible}
                              disabled={visibilityUpdatingId === review.id}
                              onChange={() =>
                                void handleToggleVisibility(review)
                              }
                              size="small"
                              color="success"
                            />
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}

                {reviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <RateReview
                        sx={{
                          fontSize: 40,
                          color: "#cbd5e1",
                        }}
                      />

                      <Typography
                        sx={{
                          mt: 1,
                          fontSize: 14,
                          fontWeight: 750,
                          color: "#334155",
                        }}
                      >
                        No reviews found
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 12,
                          color: "#94a3b8",
                        }}
                      >
                        Try changing your search or filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* PAGINATION */}
          <Box
            sx={{
              mt: 2,
              px: 0.5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Page {pagination.page} of {Math.max(pagination.total_pages, 1)} ·{" "}
              {pagination.total_records} reviews
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 1,
              }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<ChevronLeft />}
                disabled={!pagination.has_previous_page || isLoading}
                onClick={() =>
                  setPage((currentPage) => Math.max(currentPage - 1, 1))
                }
                sx={{
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: "#e2e8f0",
                }}
              >
                Previous
              </Button>

              <Button
                variant="outlined"
                size="small"
                endIcon={<ChevronRight />}
                disabled={!pagination.has_next_page || isLoading}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                sx={{
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: "#e2e8f0",
                }}
              >
                Next
              </Button>
            </Box>
          </Box>
        </>
      )}

      {/* DETAILS DIALOG */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => !isLoadingDetail && setDetailDialogOpen(false)}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              overflow: "hidden",
            },
          },
        }}
      >
        <DialogTitle sx={{ p: 0 }}>
          <Box
            sx={{
              px: 3,
              py: 2.4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Review Details
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {selectedReview
                  ? `Review #${selectedReview.id}`
                  : "Review information"}
              </Typography>
            </Box>

            <IconButton
              size="small"
              disabled={isLoadingDetail}
              onClick={() => setDetailDialogOpen(false)}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 3,
            bgcolor: "#f8fafc",
          }}
        >
          {isLoadingDetail ? (
            <Box
              sx={{
                minHeight: 340,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : reviewDetail ? (
            <Box
              sx={{
                display: "grid",
                gap: 2,
              }}
            >
              {/* REVIEW */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: {
                      xs: "column",
                      sm: "row",
                    },
                    justifyContent: "space-between",
                    alignItems: {
                      xs: "flex-start",
                      sm: "center",
                    },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Rating value={reviewDetail.rating} readOnly />

                      <Typography
                        sx={{
                          fontSize: 21,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {reviewDetail.rating}/5
                      </Typography>
                    </Box>

                    <Typography
                      sx={{
                        mt: 1.5,
                        fontSize: 13,
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                        color: reviewDetail.comment ? "#475569" : "#94a3b8",
                      }}
                    >
                      {reviewDetail.comment || "No comment was provided."}
                    </Typography>
                  </Box>

                  <VisibilityChip isVisible={reviewDetail.is_visible} />
                </Box>
              </Paper>

              {/* CUSTOMER / PROVIDER */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, 1fr)",
                  },
                  gap: 2,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.3,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography
                    sx={{
                      mb: 1.3,
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Customer
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.2,
                      alignItems: "center",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 42,
                        height: 42,
                        bgcolor: "#dbeafe",
                        color: "#1d4ed8",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      {getInitials(reviewDetail.customer?.full_name)}
                    </Avatar>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 13.5,
                          fontWeight: 750,
                          color: "#334155",
                        }}
                      >
                        {reviewDetail.customer?.full_name || "Unknown customer"}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        {reviewDetail.customer?.phone || "—"}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10.5,
                          color: "#94a3b8",
                        }}
                      >
                        {reviewDetail.customer?.email || "No email"}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.3,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography
                    sx={{
                      mb: 1.3,
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Provider
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.2,
                      alignItems: "center",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 42,
                        height: 42,
                        bgcolor: "#dcfce7",
                        color: "#15803d",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      {getInitials(reviewDetail.provider?.full_name)}
                    </Avatar>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 13.5,
                          fontWeight: 750,
                          color: "#334155",
                        }}
                      >
                        {reviewDetail.provider?.full_name || "Unknown provider"}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        {reviewDetail.provider?.phone || "—"}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10.5,
                          color: "#94a3b8",
                        }}
                      >
                        {reviewDetail.provider?.email || "No email"}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>

              {/* BOOKING */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.3,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  sx={{
                    mb: 1.5,
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  Booking Information
                </Typography>

                {reviewDetail.booking ? (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, 1fr)",
                      },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Booking
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.4,
                          fontSize: 13,
                          fontWeight: 750,
                          color: "#334155",
                        }}
                      >
                        #{reviewDetail.booking.id}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Service
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.4,
                          fontSize: 13,
                          fontWeight: 750,
                          color: "#334155",
                        }}
                      >
                        {reviewDetail.booking.service?.name ||
                          "Unknown service"}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Status
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.4,
                          fontSize: 12.5,
                          color: "#475569",
                        }}
                      >
                        {formatLabel(reviewDetail.booking.status)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Amount
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.4,
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {formatMoney(
                          reviewDetail.booking.final_price ||
                            reviewDetail.booking.estimated_price,
                        )}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        gridColumn: {
                          sm: "1 / -1",
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Service Location
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.4,
                          fontSize: 12.5,
                          color: "#334155",
                        }}
                      >
                        {reviewDetail.booking.service_address}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        {reviewDetail.booking.service_area}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#94a3b8",
                    }}
                  >
                    Booking information is not available.
                  </Typography>
                )}
              </Paper>

              {/* CREATED */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                  }}
                >
                  Review Created
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 12,
                    color: "#334155",
                  }}
                >
                  {formatDate(reviewDetail.created_at)}
                </Typography>
              </Paper>
            </Box>
          ) : null}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <Button
            onClick={() => setDetailDialogOpen(false)}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}

export default ReviewsPage;
