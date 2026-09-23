import { useMemo, useState } from "react";
import { MessageSquareText, PenLine, Search, Star } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton, StatCard } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { fullName } from "../lib/format";
import { can } from "../lib/roles";
import { useFetch } from "../lib/useFetch";
import { RatingDistribution } from "./performance/RatingDistribution";
import { ReviewItem } from "./performance/ReviewItem";
import { WriteReviewModal } from "./performance/WriteReviewModal";

const ReviewSkeleton = () => (
  <ul className="divide-y divide-slate-100">
    {[0, 1, 2].map((i) => (
      <li key={i} className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </li>
    ))}
  </ul>
);

const PerformancePage = () => {
  const { user } = useAuth();
  const canReview = can(user, "performance.review");
  const reviews = useFetch("/performance");
  const employees = useFetch(canReview ? "/employees" : null, { enabled: canReview });

  const [query, setQuery] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [writing, setWriting] = useState(false);

  const list = useMemo(() => reviews.data || [], [reviews.data]);
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const reviewedPeople = new Set(list.map((r) => r.employee?._id)).size;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = Number(minRating);
    return list.filter((r) => {
      if (r.rating < min) return false;
      if (!q) return true;
      return [fullName(r.employee), r.employee?.employeeId, r.employee?.department].some((v) => v?.toLowerCase().includes(q));
    });
  }, [list, query, minRating]);

  // You can't review yourself: hide your own profile from the picker.
  const reviewable = (employees.data || []).filter((e) => e.email?.toLowerCase() !== user.email?.toLowerCase());

  const onCreated = (review) => reviews.setData((l) => [review, ...(l || [])].sort((a, b) => new Date(b.reviewDate) - new Date(a.reviewDate)));

  return (
    <div>
      <PageHeader
        title="Performance"
        description="Review history and ratings across the team."
        actions={
          canReview && (
            <Button icon={PenLine} onClick={() => setWriting(true)} disabled={employees.loading}>
              Write review
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Average rating" value={reviews.loading ? "–" : list.length ? `${avg.toFixed(1)} / 5` : "No ratings"} hint={reviews.loading ? null : `Across ${list.length} review${list.length === 1 ? "" : "s"}`} icon={Star} tone="amber" />
        <StatCard label="Reviews" value={reviews.loading ? "–" : list.length} hint={reviews.loading ? null : `${reviewedPeople} employee${reviewedPeople === 1 ? "" : "s"} reviewed`} icon={MessageSquareText} tone="brand" />
        <div className="sm:col-span-2 lg:col-span-1">
          <RatingDistribution reviews={list} loading={reviews.loading} />
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="search" placeholder="Search by employee, ID or department" aria-label="Search reviews by employee" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Select aria-label="Minimum rating" value={minRating} onChange={(e) => setMinRating(e.target.value)} className="sm:w-48">
            <option value="0">Any rating</option>
            {[5, 4, 3, 2].map((n) => (
              <option key={n} value={n}>
                {n === 5 ? "5 stars only" : `${n}+ stars`}
              </option>
            ))}
          </Select>
        </div>

        {reviews.loading ? (
          <ReviewSkeleton />
        ) : reviews.error ? (
          <ErrorState message={reviews.error} onRetry={reviews.reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title={list.length ? "No reviews match these filters" : "No reviews yet"}
            description={list.length ? "Try a different name or lower the minimum rating." : "Reviews you and your colleagues write will show up here."}
            action={
              !list.length && canReview ? (
                <Button icon={PenLine} onClick={() => setWriting(true)}>
                  Write the first review
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((r) => (
              <ReviewItem key={r._id} review={r} />
            ))}
          </ul>
        )}
      </Card>

      {canReview && <WriteReviewModal open={writing} onClose={() => setWriting(false)} employees={reviewable} onCreated={onCreated} />}
    </div>
  );
};

export default PerformancePage;
