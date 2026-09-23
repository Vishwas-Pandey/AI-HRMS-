import { useId } from "react";

// Label + control + hint/error. Pass the control as a render function to get the id.
export const Field = ({ label, error, hint, required, children, className = "" }) => {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": error || hint ? `${id}-help` : undefined })}
      {(error || hint) && (
        <p id={`${id}-help`} className={`mt-1.5 text-xs ${error ? "text-red-600" : "text-slate-500"}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
};

export const Input = ({ error, className = "", ...props }) => (
  <input className={`input ${error ? "input-error" : ""} ${className}`} {...props} />
);

export const Select = ({ error, className = "", children, ...props }) => (
  <select className={`input pr-8 ${error ? "input-error" : ""} ${className}`} {...props}>
    {children}
  </select>
);

export const Textarea = ({ error, className = "", ...props }) => (
  <textarea className={`input min-h-[96px] ${error ? "input-error" : ""} ${className}`} {...props} />
);
