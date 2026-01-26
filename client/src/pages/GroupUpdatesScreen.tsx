import { useEffect, useMemo, useState } from "react";
import {
  FieldPath,
  Timestamp,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart } from "lucide-react";

type ChallengeSummary = {
  type?: string;
  durationSec?: number;
  stepsDelta?: number;
};

type ChallengeScheduleSummary = {
  type?: string;
  scheduledFor?: string;
};

type GroupUpdate = {
  id: string;
  authorName: string;
  authorAvatar?: string;
  postedAt?: string;
  content: string;
  photos: string[];
  challenge?: ChallengeSummary;
  challengeSchedule?: ChallengeScheduleSummary;
};

type GroupMember = {
  userId: string;
  displayName: string;
  photoUrl?: string;
};

type GroupComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt?: string;
  likedBy: string[];
};

interface GroupUpdatesScreenProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
}

const normalizeDateValue = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }
  if (typeof value === "object" && value && "toDate" in value) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    } catch {
      return null;
    }
  }
  return null;
};

const formatDate = (value?: string) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
};

export default function GroupUpdatesScreen({
  groupId,
  groupName,
  onBack,
}: GroupUpdatesScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [updates, setUpdates] = useState<GroupUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [comments, setComments] = useState<GroupComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  useEffect(() => {
    const updatesRef = collection(db, "groups", groupId, "updates");
    const updatesQuery = query(updatesRef, orderBy("postedAt", "desc"));
    const unsubscribe = onSnapshot(
      updatesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<GroupUpdate>;
          const postedAt = normalizeDateValue(data.postedAt) ?? undefined;
          return {
            id: docSnap.id,
            authorName: data.authorName || "Member",
            authorAvatar: data.authorAvatar || "",
            postedAt,
            content: data.content || "",
            photos: Array.isArray(data.photos) ? data.photos : [],
            challenge: data.challenge,
            challengeSchedule: data.challengeSchedule,
          };
        });
        setUpdates(items);
        setIsLoading(false);
      },
      () => {
        setUpdates([]);
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [groupId]);

  useEffect(() => {
    const groupRef = doc(db, "groups", groupId);
    const unsubscribe = onSnapshot(
      groupRef,
      (snapshot) => {
        const data = snapshot.data() as { members?: string[] } | undefined;
        const nextMembers = Array.isArray(data?.members)
          ? data?.members.filter((member) => typeof member === "string")
          : [];
        setMemberIds(nextMembers);
        setIsLoadingMembers(false);
      },
      () => {
        setMemberIds([]);
        setMembers([]);
        setIsLoadingMembers(false);
      }
    );
    return unsubscribe;
  }, [groupId]);

  useEffect(() => {
    if (memberIds.length === 0) {
      setMembers([]);
      return;
    }

    let isActive = true;
    const uniqueMembers = Array.from(new Set(memberIds));

    const loadMembers = async () => {
      try {
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueMembers.length; i += 10) {
          chunks.push(uniqueMembers.slice(i, i + 10));
        }
        const profiles = new Map<string, GroupMember>();
        for (const chunk of chunks) {
          const profilesQuery = query(
            collection(db, "publicProfiles"),
            where(FieldPath.documentId(), "in", chunk)
          );
          const snapshot = await getDocs(profilesQuery);
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Partial<GroupMember>;
            profiles.set(docSnap.id, {
              userId: docSnap.id,
              displayName: data.displayName || "Member",
              photoUrl: data.photoUrl || "",
            });
          });
        }
        const ordered = uniqueMembers.map((memberId) => {
          const profile = profiles.get(memberId);
          return (
            profile ?? {
              userId: memberId,
              displayName: "Member",
              photoUrl: "",
            }
          );
        });
        if (isActive) {
          setMembers(ordered);
        }
      } catch (error) {
        console.error("Failed to load group members:", error);
        if (isActive) {
          setMembers(
            uniqueMembers.map((memberId) => ({
              userId: memberId,
              displayName: "Member",
              photoUrl: "",
            }))
          );
        }
      }
    };

    void loadMembers();

    return () => {
      isActive = false;
    };
  }, [memberIds]);

  useEffect(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
    const commentsRef = collection(db, "groups", groupId, "comments");
    const commentsQuery = query(
      commentsRef,
      where("createdAt", ">=", cutoffTimestamp),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<GroupComment>;
          return {
            id: docSnap.id,
            authorId: typeof data.authorId === "string" ? data.authorId : "",
            authorName: data.authorName || "Member",
            authorAvatar: data.authorAvatar || "",
            text: data.text || "",
            createdAt: normalizeDateValue(data.createdAt) ?? undefined,
            likedBy: Array.isArray(data.likedBy)
              ? data.likedBy.filter((id) => typeof id === "string")
              : [],
          };
        });
        setComments(items);
        setIsLoadingComments(false);
      },
      () => {
        setComments([]);
        setIsLoadingComments(false);
      }
    );
    return unsubscribe;
  }, [groupId]);

  useEffect(() => {
    if (!user?.uid || !memberIds.includes(user.uid)) return;
    const cleanupExpiredComments = async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
      try {
        const commentsRef = collection(db, "groups", groupId, "comments");
        const expiredQuery = query(
          commentsRef,
          where("createdAt", "<", cutoffTimestamp),
          orderBy("createdAt", "asc"),
          limit(20)
        );
        const snapshot = await getDocs(expiredQuery);
        await Promise.all(
          snapshot.docs.map((docSnap) =>
            deleteDoc(doc(db, "groups", groupId, "comments", docSnap.id))
          )
        );
      } catch (error) {
        console.error("Failed to clean up expired comments:", error);
      }
    };
    void cleanupExpiredComments();
  }, [groupId, memberIds, user?.uid]);

  const challengeCount = useMemo(
    () =>
      updates.filter((item) => item.challenge || item.challengeSchedule).length,
    [updates]
  );

  const handlePostComment = async () => {
    if (!user?.uid) {
      toast({
        title: "Not signed in",
        description: "Sign in to post to the group.",
        variant: "destructive",
      });
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed || isPostingComment) return;

    const commentRef = doc(collection(db, "groups", groupId, "comments"));
    const authorName =
      user.displayName?.trim() || user.email?.split("@")[0] || "Member";
    const authorAvatar = user.photoURL || "";
    const optimistic: GroupComment = {
      id: commentRef.id,
      authorId: user.uid,
      authorName,
      authorAvatar,
      text: trimmed,
      createdAt: new Date().toISOString(),
      likedBy: [],
    };

    setIsPostingComment(true);
    setComments((prev) => [optimistic, ...prev]);
    setCommentText("");

    try {
      await setDoc(commentRef, {
        authorId: user.uid,
        authorName,
        authorAvatar,
        text: trimmed,
        createdAt: serverTimestamp(),
        likedBy: [],
      });
    } catch (error) {
      console.error("Failed to post comment:", error);
      setComments((prev) => prev.filter((item) => item.id !== optimistic.id));
      setCommentText(trimmed);
      toast({
        title: "Comment failed",
        description: "We couldn't post your comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleToggleLike = async (comment: GroupComment) => {
    if (!user?.uid) {
      toast({
        title: "Not signed in",
        description: "Sign in to like a comment.",
        variant: "destructive",
      });
      return;
    }
    const alreadyLiked = comment.likedBy.includes(user.uid);
    setComments((prev) =>
      prev.map((item) =>
        item.id === comment.id
          ? {
              ...item,
              likedBy: alreadyLiked
                ? item.likedBy.filter((id) => id !== user.uid)
                : [...item.likedBy, user.uid],
            }
          : item
      )
    );
    try {
      await setDoc(
        doc(db, "groups", groupId, "comments", comment.id),
        {
          likedBy: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to update comment likes:", error);
      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                likedBy: alreadyLiked
                  ? [...item.likedBy, user.uid]
                  : item.likedBy.filter((id) => id !== user.uid),
              }
            : item
        )
      );
    }
  };

  const handleDeleteComment = async (comment: GroupComment) => {
    if (!user?.uid || comment.authorId !== user.uid) return;
    setComments((prev) => prev.filter((item) => item.id !== comment.id));
    try {
      await deleteDoc(doc(db, "groups", groupId, "comments", comment.id));
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast({
        title: "Delete failed",
        description: "We couldn't delete your comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-white/60 hover:text-white"
              data-testid="button-back-group"
            >
              Back to Profile
            </button>
            <h1 className="text-2xl font-bold mt-2">{groupName}</h1>
            <p className="text-xs text-white/50">Updates from group members.</p>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-white/50">Challenges</p>
            <span className="text-xs text-white/60">{challengeCount} shared</span>
          </div>
          <p className="text-xs text-white/50">
            Join a new challenge to post progress to this group.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-white/50">Group members</p>
            <span className="text-xs text-white/60">{members.length}</span>
          </div>
          {isLoadingMembers ? (
            <div className="text-xs text-white/50">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="text-xs text-white/50">No members yet.</div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center gap-2">
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                        {member.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-white/70">{member.displayName}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-widest text-white/50">Let's talk</p>
            <span className="text-xs text-white/40">Comments expire after 7 days</span>
          </div>
          <div className="space-y-3">
            <Textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Share a note with the group..."
              className="min-h-[90px] bg-black/40 border-white/10 text-sm text-white"
              data-testid="input-group-comment"
            />
            <div className="flex items-center justify-end">
              <Button
                type="button"
                onClick={handlePostComment}
                disabled={!commentText.trim() || isPostingComment}
                data-testid="button-post-comment"
              >
                {isPostingComment ? "Posting..." : "Post comment"}
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {isLoadingComments ? (
              <div className="text-xs text-white/50">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-xs text-white/50">No comments yet.</div>
            ) : (
              comments.map((comment) => {
                const isLiked = user?.uid ? comment.likedBy.includes(user.uid) : false;
                const canDelete = user?.uid === comment.authorId;
                return (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5">
                          {comment.authorAvatar ? (
                            <img
                              src={comment.authorAvatar}
                              alt={comment.authorName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                              {comment.authorName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{comment.authorName}</p>
                          <p className="text-[10px] text-white/40">
                            {formatDate(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment)}
                          className="text-[10px] text-white/40 hover:text-white"
                          data-testid={`button-delete-comment-${comment.id}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-white/80">{comment.text}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(comment)}
                        className={`inline-flex items-center gap-1 text-[11px] ${
                          isLiked ? "text-primary" : "text-white/50"
                        }`}
                        data-testid={`button-like-comment-${comment.id}`}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`}
                        />
                        {comment.likedBy.length}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="space-y-4">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-xs text-white/50">
              Loading updates...
            </div>
          ) : updates.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-xs text-white/50">
              No group updates yet.
            </div>
          ) : (
            updates.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {item.authorAvatar ? (
                      <img
                        src={item.authorAvatar}
                        alt={item.authorName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                        {item.authorName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.authorName}</p>
                    <p className="text-xs text-white/40">{formatDate(item.postedAt)}</p>
                  </div>
                </div>
                <p className="text-sm text-white/80">{item.content}</p>
                {(item.challenge || item.challengeSchedule) && (
                  <div className="text-xs text-primary">
                    {item.challenge?.type || item.challengeSchedule?.type} Challenge
                  </div>
                )}
                {item.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {item.photos.map((photo, index) => (
                      <img
                        key={`${item.id}-${index}`}
                        src={photo}
                        alt="Group update"
                        className="h-24 w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
