import { MessageSquareText } from "lucide-react";
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, Stars } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { useFetch } from "../../lib/useFetch";
import { ReviewItem } from "../performance/ReviewItem";

const MyReviewsPage = () => {
  const { data, error, loading, reload } = useFetch("/performance/my-reviews");
  const reviews = data || [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My reviews" description="Feedback and ratings from your managers and HR." />

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-40" />
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-500">Average rating</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-4xl font-semibold tabular-nums text-slate-900">{reviews.length ? avg.toFixed(1) : "—"}</span>
                  <div>
                    <Stars value={Math.round(avg)} size="h-5 w-5" />
                    <p className="mt-0.5 text-xs text-slate-500">
                      {reviews.length} review{reviews.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!loading && reviews[0] && (
              <div className="text-sm sm:text-right">
                <p className="text-slate-500">Latest review</p>
                <p className="font-medium text-slate-900">{formatDate(reviews[0].reviewDate)}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Review history" />
            {loading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : reviews.length === 0 ? (
              <EmptyState icon={MessageSquareText} title="No reviews yet" description="When your manager or HR writes a review, it will show up here." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {reviews.map((r) => (
                  <ReviewItem key={r._id} review={r} showEmployee={false} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyReviewsPage;
