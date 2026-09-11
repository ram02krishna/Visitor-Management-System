import { useEffect, useRef } from "react";

export type SyncTopic = "visits" | "visitors" | "hosts" | "stats" | "students" | "lostAndFound" | "vehicles" | "all";

class DataSyncBus extends EventTarget {
  private channel: BroadcastChannel | null = null;

  constructor() {
    super();
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel("vms_data_sync_channel");
        this.channel.onmessage = (event: MessageEvent<{ topic: SyncTopic }>) => {
          if (event.data?.topic) {
            this.dispatchEvent(new CustomEvent("sync", { detail: event.data.topic }));
          }
        };
      } catch {
        this.channel = null;
      }
    }
  }

  public notify(topic: SyncTopic = "all") {
    this.dispatchEvent(new CustomEvent("sync", { detail: topic }));

    try {
      this.channel?.postMessage({ topic });
    } catch {
    }
  }

  public subscribe(topics: SyncTopic[], callback: (topic: SyncTopic) => void) {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SyncTopic>).detail;
      if (topics.includes("all") || topics.includes(detail) || detail === "all") {
        callback(detail);
      }
    };

    this.addEventListener("sync", handler);
    return () => {
      this.removeEventListener("sync", handler);
    };
  }
}

export const dataSync = new DataSyncBus();

export function useDataSync(topics: SyncTopic[], onSync: (topic: SyncTopic) => void) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    const unsubscribe = dataSync.subscribe(topics, (topic) => {
      onSyncRef.current(topic);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onSyncRef.current("all");
      }
    };

    const handleFocus = () => {
      onSyncRef.current("all");
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [topics.join(",")]);
}
