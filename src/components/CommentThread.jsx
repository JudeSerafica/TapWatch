import { useState, useEffect } from 'react'
import { MessageCircle, Send, ThumbsUp, User, Shield, Clock, Heart } from 'lucide-react'
import { useAuth } from '../context/useAuth'

/**
 * Comment Thread Component
 * Allows users to comment on incidents and see updates
 */
export default function CommentThread({ incidentId, incident }) {
  const { profile, isAdmin } = useAuth()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [upvotes, setUpvotes] = useState(new Set())
  const [isFollowing, setIsFollowing] = useState(false)

  // Mock data - replace with actual database calls
  useEffect(() => {
    loadComments()
    checkIfFollowing()
  }, [incidentId])

  const loadComments = () => {
    // Mock comments - replace with actual database query
    const mockComments = [
      {
        id: 1,
        user_id: 'user1',
        user_name: 'Juan Dela Cruz',
        comment: 'Salamat sa mabilis na response!',
        is_official: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        likes: 5
      },
      {
        id: 2,
        user_id: 'admin1',
        user_name: 'Barangay Official',
        comment: 'Naka-dispatch na ang response team. ETA 10 minutes.',
        is_official: true,
        created_at: new Date(Date.now() - 1800000).toISOString(),
        likes: 12
      }
    ]
    setComments(mockComments)
  }

  const checkIfFollowing = () => {
    // Check if user is following this incident
    // Replace with actual database query
    setIsFollowing(false)
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setLoading(true)

    // Mock comment submission - replace with actual database insert
    const comment = {
      id: Date.now(),
      user_id: profile?.id,
      user_name: profile?.full_name || 'Anonymous',
      comment: newComment,
      is_official: isAdmin,
      created_at: new Date().toISOString(),
      likes: 0
    }

    setComments(prev => [...prev, comment])
    setNewComment('')
    setLoading(false)
  }

  const handleUpvote = (commentId) => {
    setUpvotes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing)
    // Save to database
  }

  const getTimeAgo = (timestamp) => {
    const now = new Date()
    const commentDate = new Date(timestamp)
    const diffMs = now - commentDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  return (
    <div className="bg-white rounded-xl border">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-blue-600" />
          <h3 className="font-bold text-gray-900 text-sm">
            Comments & Updates
          </h3>
          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
            {comments.length}
          </span>
        </div>
        
        {/* Follow Button */}
        <button
          onClick={handleFollowToggle}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            isFollowing
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isFollowing ? '✓ Following' : '+ Follow'}
        </button>
      </div>

      {/* Comments List */}
      <div className="max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="divide-y">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    comment.is_official ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    {comment.is_official ? (
                      <Shield size={14} className="text-white" />
                    ) : (
                      <User size={14} className="text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* User Info */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900">
                        {comment.user_name}
                      </span>
                      {comment.is_official && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          Official
                        </span>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={10} />
                        {getTimeAgo(comment.created_at)}
                      </span>
                    </div>

                    {/* Comment Text */}
                    <p className="text-sm text-gray-700 mb-2">
                      {comment.comment}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleUpvote(comment.id)}
                        className={`flex items-center gap-1 text-xs font-medium transition ${
                          upvotes.has(comment.id)
                            ? 'text-red-600'
                            : 'text-gray-500 hover:text-red-600'
                        }`}
                      >
                        <Heart
                          size={14}
                          fill={upvotes.has(comment.id) ? 'currentColor' : 'none'}
                        />
                        {comment.likes + (upvotes.has(comment.id) ? 1 : 0)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Input */}
      <div className="px-5 py-4 border-t bg-gray-50">
        <form onSubmit={handleSubmitComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={14} />
            Send
          </button>
        </form>
        {isAdmin && (
          <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
            <Shield size={10} />
            Posting as Official
          </p>
        )}
      </div>
    </div>
  )
}
