import { Avatar, RoleBadge, Stars } from "../../components/ui";
import { formatDate, fullName } from "../../lib/format";

// Also used by the self-service "My reviews" page (showEmployee=false).
export const ReviewItem = ({ review, showEmployee = true }) => (
  <li className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      {showEmployee ? (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={fullName(review.employee)} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{fullName(review.employee)}</p>
            <p className="truncate text-xs text-slate-500">
              {review.employee?.jobTitle} · {review.employee?.department}
            </p>
          </div>
        </div>
      ) : (
        <Stars value={review.rating} />
      )}
      <div className="flex items-center gap-3">
        {showEmployee && <Stars value={review.rating} />}
        <time className="text-xs text-slate-500" dateTime={review.reviewDate}>
          {formatDate(review.reviewDate)}
        </time>
      </div>
    </div>
    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{review.comments}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span>Reviewed by</span>
      <span className="font-medium text-slate-700">{review.reviewer?.name || "Former user"}</span>
      {review.reviewer?.role && <RoleBadge role={review.reviewer.role} />}
    </div>
  </li>
);
