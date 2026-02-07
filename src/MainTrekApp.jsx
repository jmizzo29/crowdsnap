import { useState, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

export default function MainTrekApp() {
  const [memoryType, setMemoryType] = useState("photo");
  const [day, setDay] = useState("Day 1");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);

  // Load memories on first render
  useEffect(() => {
    const loadMemories = async () => {
      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading:", error);
        return;
      }

      setMemories(data || []);
    };

    loadMemories();
  }, []);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() && !notes.trim() && files.length === 0) {
      alert("Please add a title, some notes, or at least one file.");
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
        type: memoryType,
        day,
        title: title.trim() || "(Untitled memory)",
        notes: notes.trim(),
        media: uploadedMedia,
      };

      const { data, error } = await supabase
        .from("memories")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setMemories((prev) => [data, ...prev]);
      setTitle("");
      setNotes("");
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

        {/* ⭐ RESTORED PRODUCTION HEADER ⭐ */}
        <header className="app-header">

          {/* Banner Image */}
          <img
            src={`${import.meta.env.BASE_URL}newbanner.jpg`}
            alt="Groupix banner"
            className="header-banner-image"
          />

          {/* Description */}
          <div className="header-description">
  <p>
    Groupix brings everyones photos, videos, and notes into one shared space -- no logins, no texting, no digging through chats.
  </p>

  <p>
    Create a group, share a link, and let everyone contribute. Perfect for trips, reunions, events, and teams.
  </p>
</div>

        </header>

        {/* Form */}
        <main className="app-main">
          <section className="layout-grid">
            <div className="card">
              <h2 className="card-title">Add a new memory</h2>

              <form className="memory-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-field">
                    <label>Memory type</label>
                    <div className="pill-row">
                      <button
                        type="button"
                        className={
                          "pill" +
                          (memoryType === "photo" ? " pill--active" : "")
                        }
                        onClick={() => setMemoryType("photo")}
                      >
                        📷 Photos
                      </button>

                      <button
                        type="button"
                        className={
                          "pill" +
                          (memoryType === "video" ? " pill--active" : "")
                        }
                        onClick={() => setMemoryType("video")}
                      >
                        🎥 Videos
                      </button>

                      <button
                        type="button"
                        className={
                          "pill" +
                          (memoryType === "diary" ? " pill--active" : "")
                        }
                        onClick={() => setMemoryType("diary")}
                      >
                        ✏️ Diary
                      </button>
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Trip day</label>
                    <select
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    >
                      <option>Day 1</option>
                      <option>Day 2</option>
                      <option>Day 3</option>
                      <option>Travel home</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Title</label>
                  <input
                    type="text"
                    placeholder="Evening campfire..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Notes / diary entry</label>
                  <textarea
                    rows={3}
                    placeholder="What happened?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Media</label>
                  <input
                    type="file"
                    multiple
                    accept={
                      memoryType === "photo"
                        ? "image/*"
                        : memoryType === "video"
                        ? "video/*"
                        : "image/*,video/*"
                    }
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
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save memory"}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Timeline */}
          <section className="timeline">
            <div className="timeline-header">
              <h2 className="card-title">Trip Timeline</h2>
            </div>

            {memories.map((memory) => (
              <article key={memory.id} className="memory-card">

                <header className="memory-card-header">
                  <div>
                    <div className="memory-meta-row">
                      <span className="memory-day">{memory.day}</span>
                      <span className="memory-type">
                        {memory.type === "photo"
                          ? "📷 Photos"
                          : memory.type === "video"
                          ? "🎥 Videos"
                          : "✏️ Diary"}
                      </span>
                    </div>
                    <h3 className="memory-title">{memory.title}</h3>
                  </div>
                </header>

                {memory.notes && (
                  <p className="memory-notes">{memory.notes}</p>
                )}

                {memory.media && memory.media.length > 0 && (
                  <div className="media-grid">
                    {memory.media.map((m, idx) =>
                      m.type?.startsWith("video") ? (
                        <video
                          key={idx}
                          className="media-item"
                          controls
                          src={m.url}
                        />
                      ) : (
                        <img
                          key={idx}
                          className="media-item"
                          src={m.url}
                          alt={m.name}
                        />
                      )
                    )}
                  </div>
                )}
              </article>
            ))}
          </section>
        </main>

        <footer className="app-footer">
          <span className="app-footer-title">Groupix</span>
        </footer>

      </div>
    </div>
  );
}


