// Friendly empty state for the knowledge base: the open-book illustration,
// a short title, one line of help and an optional action.
export default function EmptyState({ title, text, action, image = '/empty-kb.svg' }) {
  return (
    <div className="empty-state">
      <img src={image} alt="" draggable="false" />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}
