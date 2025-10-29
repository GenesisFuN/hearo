"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MessageCircle, Send, Trash2, Edit2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { trackComment } from "@/lib/analytics";

interface Comment {
  id: string;
  user_id: string;
  work_id: string;
  comment_text: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
  };
}

interface BookCommentsProps {
  bookId: string;
  initialCount?: number;
}

export default function BookComments({
  bookId,
  initialCount = 0,
}: BookCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchComments();
  }, [bookId]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setCurrentUserId(session?.user?.id || null);
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      console.log("Fetching comments for bookId:", bookId);
      const response = await fetch(`/api/books/${bookId}/comments`);

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched comments:", data.comments?.length || 0);
        setComments(data.comments || []);
      } else {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        setError(errorData.error || "Failed to load comments");
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!isAuthenticated) {
      alert("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    try {
      setPosting(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(`/api/books/${bookId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commentText: newComment.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Comment posted successfully:", data);
        setNewComment("");

        // Track comment event
        trackComment(bookId);

        // Wait a moment for database trigger to update count
        setTimeout(() => fetchComments(), 500);
      } else {
        const errorData = await response.json();
        console.error("Failed to post comment:", errorData);
        alert(errorData.error || "Failed to post comment");
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const postReply = async (parentId: string) => {
    if (!isAuthenticated) {
      alert("Please sign in to reply");
      return;
    }

    const replyText = replyTexts[parentId] || "";
    if (!replyText.trim()) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(`/api/books/${bookId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentText: replyText.trim(),
          parentCommentId: parentId,
        }),
      });

      if (response.ok) {
        setReplyTexts((prev) => ({ ...prev, [parentId]: "" }));
        setReplyingTo(null);

        // Track comment event (replies are also comments)
        trackComment(bookId);

        await fetchComments();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to post reply");
      }
    } catch (err) {
      console.error("Failed to post reply:", err);
      alert("Failed to post reply");
    }
  };

  const editComment = async (commentId: string) => {
    if (!editText.trim()) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `/api/books/${bookId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ commentText: editText.trim() }),
        }
      );

      if (response.ok) {
        setEditingComment(null);
        setEditText("");
        await fetchComments();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update comment");
      }
    } catch (err) {
      console.error("Failed to update comment:", err);
      alert("Failed to update comment");
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `/api/books/${bookId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        await fetchComments();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete comment");
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert("Failed to delete comment");
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditText(comment.comment_text);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditText("");
  };

  // Group comments by parent
  const topLevelComments = useMemo(
    () => comments.filter((c) => !c.parent_comment_id),
    [comments]
  );

  const getReplies = useCallback(
    (parentId: string) =>
      comments.filter((c) => c.parent_comment_id === parentId),
    [comments]
  );

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return "just now";
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  }, []);

  const CommentItem = ({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) => {
    const isOwner = currentUserId === comment.user_id;
    const replies = getReplies(comment.id);

    return (
      <div
        className={`${isReply ? "ml-8 mt-2" : "mb-4"} ${isReply ? "border-l-2 border-surface pl-4" : ""}`}
      >
        <div className="bg-surface/30 rounded-lg p-4">
          {/* Comment Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-sm">
                {comment.user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">@{comment.user.username}</p>
                <p className="text-xs text-text-light/50">
                  {formatDate(comment.created_at)}
                </p>
              </div>
            </div>

            {/* Action Buttons (only for comment owner) */}
            {isOwner && editingComment !== comment.id && (
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(comment)}
                  className="text-text-light/50 hover:text-accent transition"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="text-text-light/50 hover:text-red-500 transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Comment Content */}
          {editingComment === comment.id ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-background text-text-light px-3 py-2 rounded-lg border border-surface focus:border-accent outline-none resize-none block"
                style={{
                  direction: "ltr !important" as any,
                  unicodeBidi: "normal",
                  textAlign: "left",
                  display: "block",
                }}
                rows={3}
                maxLength={1000}
                dir="ltr"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 text-sm text-text-light/70 hover:text-text-light transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => editComment(comment.id)}
                  disabled={!editText.trim()}
                  className="bg-accent hover:bg-accent/90 text-background px-4 py-1 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-text-light/90">{comment.comment_text}</p>
          )}

          {/* Reply Button */}
          {!isReply && editingComment !== comment.id && (
            <button
              onClick={() =>
                setReplyingTo(replyingTo === comment.id ? null : comment.id)
              }
              className="mt-2 text-xs text-accent hover:text-accent/80 transition flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              Reply
            </button>
          )}

          {/* Reply Input */}
          {replyingTo === comment.id && (
            <form
              key={`reply-form-${comment.id}`}
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                postReply(comment.id);
              }}
            >
              <textarea
                key={`reply-textarea-${comment.id}`}
                id={`reply-to-${comment.id}`}
                name={`reply-${comment.id}`}
                defaultValue=""
                ref={(el) => {
                  if (el && replyTexts[comment.id]) {
                    el.value = replyTexts[comment.id];
                  }
                }}
                onChange={(e) => {
                  setReplyTexts((prev) => ({
                    ...prev,
                    [comment.id]: e.target.value,
                  }));
                }}
                placeholder="Write a reply..."
                className="w-full bg-background text-text-light px-3 py-2 rounded-lg border border-surface focus:border-accent outline-none resize-none block"
                style={{
                  direction: "ltr !important" as any,
                  unicodeBidi: "normal",
                  textAlign: "left",
                  display: "block",
                }}
                rows={2}
                maxLength={1000}
                autoFocus
                dir="ltr"
                lang="en"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyTexts((prev) => ({ ...prev, [comment.id]: "" }));
                  }}
                  className="px-3 py-1 text-sm text-text-light/70 hover:text-text-light transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!(replyTexts[comment.id] || "").trim()}
                  className="bg-accent hover:bg-accent/90 text-background px-4 py-1 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Reply
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Nested Replies */}
        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-surface/30 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        Comments ({comments.length})
      </h2>

      {/* Post New Comment */}
      {isAuthenticated ? (
        <div className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts about this audiobook..."
            className="w-full bg-background text-text-light px-4 py-3 rounded-lg border border-surface focus:border-accent outline-none resize-none block"
            style={{
              direction: "ltr !important" as any,
              unicodeBidi: "normal",
              textAlign: "left",
              display: "block",
            }}
            rows={3}
            maxLength={1000}
            dir="ltr"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-text-light/50">
              {newComment.length}/1000 characters
            </p>
            <button
              onClick={postComment}
              disabled={!newComment.trim() || posting}
              className="bg-accent hover:bg-accent/90 text-background px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {posting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-background/50 rounded-lg p-4 text-center">
          <p className="text-text-light/70 mb-2">
            Sign in to join the conversation
          </p>
          <a
            href="/auth/signin"
            className="text-accent hover:text-accent/80 font-medium"
          >
            Sign in
          </a>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-text-light/70">Loading comments...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-text-light/30 mx-auto mb-2" />
          <p className="text-text-light/70">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
