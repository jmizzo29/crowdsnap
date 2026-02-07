import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import { useGroup } from "./GroupContext.jsx";

const MAX_MEMORIES = 60;
const MAX_MEDIA = 120;

export default function MainTrekApp() {
  const [files, setFiles] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const group = useGroup();
  const groupLabel = group?.name ?? "Group";
  const groupId = group?.id ?? null;

  useEffect(() => {
    const loadMedia = async () => {
      let query = supabase
        .from("memories")
        .select("id, created_at, media")
        .order("created_at", { ascending: false })
        .limit(MAX_MEMORIES);

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading:", error);
        return;
      }

      const flattened = (data || []).flatMap((memory) => {
        const items = Array.isArray(memory.media) ? memory.media : [];
        return items.map((item) => ({
          ...item,
          memoryId: memory.id,
          created_at: memory.created_at,
        }));
      });

      setMediaItems(flattened.slice(0, MAX_MEDIA));
    };

    loadMedia();
  }, [groupId]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      alert("Please choose at least one file.");
      return;
    }

    setLoading(true);

    try {
      const uploadedMedia = [];

      for (const file of files) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("trip-media")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("trip-media").getPublicUrl(fileName);

        uploadedMedia.push({
          url: publicUrl,
          name: file.name,
          type: file.type,
          path: fileName,
        });
      }

      const payload = {
        group_id: groupId,
        type: "media",
        day: "Upload",
        title: files.length === 1 ? files[0].name : "Group upload",
        notes: "",
        media: uploadedMedia,
      };

      const { data, error } = await supabase
        .from("memories")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const now = data?.created_at || new Date().toISOString();
      const newItems = uploadedMedia.map((item) => ({
        ...item,
        memoryId: data?.id ?? null,
        created_at: now,
      }));

      setMediaItems((prev) => [...newItems, ...prev].slice(0, MAX_MEDIA));
      setFiles([]);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-root">
      <div className="app-shell">
        <header className="app-header">
          <img
            src={`${import.meta.env.BASE_URL}newbanner.jpg`}
            alt="Groupix banner"
            className="header-banner-image"
          />

          <div className="header-description">
            <p>
              Groupix brings everyones photos and videos into one shared space.
              Share a link and everyone can upload in seconds.
            </p>
            <p>
              No logins. No group chats. Just fast uploads for your event or
              trip.
            </p>
          </div>
        </header>

        <main className="app-main">
          <section className="upload-panel">
            <div className="card">
              <h2 className="card-title">Upload photos and videos</h2>
              <p className="card-subtitle">Group: {groupLabel}</p>

              <form className="memory-form" onSubmit={handleSubmit}>
                <div className="form-field">
                  <label>Choose files</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />

                  {files.length > 0 && (
                    <div className="selected-files">
                      {files.length} file{files.length > 1 ? "s" : ""} selected
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={loading || files.length === 0}
                  >
                    {loading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="gallery">
            <div className="timeline-header">
              <h2 className="card-title">Latest uploads</h2>
              <p className="card-subtitle">{mediaItems.length} items</p>
            </div>

            {mediaItems.length === 0 ? (
              <div className="card">
                <p className="card-subtitle">
                  No uploads yet. Add the first photos or videos above.
                </p>
              </div>
            ) : (
              <div className="media-grid">
                {mediaItems.map((m, idx) =>
                  m.type?.startsWith("video") ? (
                    <video
                      key={`${m.path || m.url || idx}`}
                      className="media-item"
                      controls
                      preload="metadata"
                      src={m.url}
                    />
                  ) : (
                    <img
                      key={`${m.path || m.url || idx}`}
                      className="media-item"
                      src={m.url}
                      alt={m.name || "Upload"}
                      loading="lazy"
                    />
                  )
                )}
              </div>
            )}
          </section>
        </main>

        <footer className="app-footer">
          <span className="app-footer-title">Groupix</span>
        </footer>
      </div>
    </div>
  );
}
