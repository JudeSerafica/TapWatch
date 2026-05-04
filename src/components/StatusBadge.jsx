export default function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    responding: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  )
}
