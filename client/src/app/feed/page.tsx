import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  DocumentData,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
} from "firebase/firestore";
import { Loader2, Plus, Search } from "lucide-react";
import ActivityPost, { Activity } from "@/components/feed/ActivityPost";
import CreateActivityModal from "@/components/feed/CreateActivityModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";

const PAGE_SIZE = 20;

const mapActivityDoc = (doc: QueryDocumentSnapshot<DocumentData>): Activity => ({
  id: doc.id,
  ...(doc.data() as Omit<Activity, "id">),
});

const FeedSkeleton = () => (
  <div className="space-y-6">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={`feed-skeleton-${index}`}
        className="rounded-xl border border-card-border bg-card p-6"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="mt-4 h-48 w-full rounded-lg" />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((__, metricIndex) => (
            <Skeleton
              key={`metric-skeleton-${metricIndex}`}
              className="h-16 w-full rounded-lg"
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const pagesLoadedRef = useRef(1);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user && typeof window !== "undefined") {
      window.location.href = "/auth/signin";
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    pagesLoadedRef.current = 1;
    const baseQuery = query(
      collection(db, "activities"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        const nextActivities = snapshot.docs.map(mapActivityDoc);
        setActivities((prev) => {
          const firstPageIds = new Set(nextActivities.map((item) => item.id));
          const existing = prev.filter((item) => !firstPageIds.has(item.id));
          return [...nextActivities, ...existing];
        });
        if (pagesLoadedRef.current === 1) {
          lastDocRef.current =
            snapshot.docs[snapshot.docs.length - 1] ?? null;
          setHasMore(snapshot.docs.length === PAGE_SIZE);
        }
        setIsLoading(false);
      },
      () => {
        toast({
          title: "Unable to load feed",
          description: "Please refresh to try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !lastDocRef.current) return;
    setIsLoadingMore(true);
    try {
      const nextQuery = query(
        collection(db, "activities"),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(nextQuery);
      const nextActivities = snapshot.docs.map(mapActivityDoc);
      setActivities((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const deduped = nextActivities.filter(
          (activity) => !existingIds.has(activity.id)
        );
        return [...prev, ...deduped];
      });
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? lastDocRef.current;
      pagesLoadedRef.current += 1;
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      toast({
        title: "Unable to load more",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, toast]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loadMore]);

  const filteredActivities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return activities;
    return activities.filter((activity) =>
      [
        activity.title,
        activity.description,
        activity.userName,
        activity.activityType,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [activities, searchTerm]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="Xuunu logo" className="h-9 w-9" />
            <span className="text-lg font-semibold">Xuunu</span>
          </div>

          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search activities"
                className="h-11 pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          <button className="rounded-full border border-white/10 p-1 hover-elevate">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
              <AvatarFallback>
                {user.displayName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {isLoading ? (
          <FeedSkeleton />
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-16 text-center">
            <div className="text-5xl text-primary/40">✦</div>
            <p className="mt-4 text-xl font-semibold">No activities yet. Start tracking!</p>
            <p className="mt-2 text-sm text-white/60">
              Share your first workout to kick off the feed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredActivities.map((activity) => (
              <ActivityPost key={activity.id} activity={activity} />
            ))}
          </div>
        )}

        {isLoadingMore && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        <div ref={loadMoreRef} className="h-10" />
      </main>

      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CreateActivityModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
