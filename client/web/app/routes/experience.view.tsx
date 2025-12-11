import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  fetchExperience,
  getBookmarks,
  removeBookmark,
  saveBookmark,
  loadSubstances,
} from "~/utils/actions";
import { Layout } from "~/components/layout/view/layout";
import {
  ArrowLeft,
  Bookmark,
  Volume2,
  VolumeX,
  Pause,
  Play,
} from "lucide-react";
import { Loader } from "~/components/loader";
import DOMPurify from "dompurify";
import { highlightErowidNotes, getCachedSubstances } from "~/utils/utils";
import { useCancelSpeechOnNavigate } from "~/hooks/useCancelSpeechOnNavigate";

export const loader = async () => {
  const baseUrl = process.env.SERVER_URL ?? "";
  return { baseUrl };
};

export default function ExperienceViewPage() {
  useCancelSpeechOnNavigate();
  const [searchParams] = useSearchParams();
  const { baseUrl } = useLoaderData<{ baseUrl: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [experience, setExperience] = useState<any | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [substanceLinks, setSubstanceLinks] = useState<
    { name: string; url: string | null }[]
  >([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const utteranceQueue = useRef<SpeechSynthesisUtterance[]>([]);
  const isMounted = useRef(true);

  const url = searchParams.get("url");

  const stopTTS = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceQueue.current = [];
    if (isMounted.current) {
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopTTS();
    };
  }, [stopTTS]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }
    const synth = window.speechSynthesis;
    const handleVoicesChanged = () => {
      if (synth.getVoices().length > 0 && isMounted.current) {
        setVoicesLoaded(true);
      }
    };
    if (synth.getVoices().length > 0) {
      setVoicesLoaded(true);
    } else {
      synth.addEventListener("voiceschanged", handleVoicesChanged);
    }
    return () =>
      synth.removeEventListener("voiceschanged", handleVoicesChanged);
  }, []);

  useEffect(() => {
    if (!url || !url.startsWith("http")) {
      navigate("/dashboard");
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        stopTTS();
        const data = await fetchExperience(baseUrl || "", url);
        const cleaned = DOMPurify.sanitize(
          highlightErowidNotes(data.data?.content)
        );
        data.data.content = cleaned;
        setExperience(data.data);

        const bookmarks = getBookmarks();
        setIsBookmarked(bookmarks.some((b) => b.url === data.data.url));

        let substances = getCachedSubstances();
        if (
          substances &&
          typeof substances === "object" &&
          "data" in substances
        ) {
          substances = substances.data as unknown[];
        }

        if (!substances) {
          await loadSubstances(baseUrl);
          const fresh = getCachedSubstances();
          if (fresh && typeof fresh === "object" && "data" in fresh) {
            substances = fresh.data as unknown[];
          } else {
            substances = fresh as unknown[];
          }
        }

        if (substances) {
          const allItems = Object.values(substances).flat();
          const names = data.data.substance
            .split(/,|&|•/g)
            .map((n: string) => n.trim())
            .filter(Boolean);

          const links = names.map((name: string) => {
            const match: any = allItems.find(
              (s: any) =>
                s.name?.toLowerCase().replace(/\s+/g, "") ===
                name.toLowerCase().replace(/\s+/g, "")
            );
            return { name, url: match?.info_url ?? null };
          });

          setSubstanceLinks(links);
        }
      } catch (err) {
        console.error("Failed to fetch experience:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [url, navigate, stopTTS, baseUrl]);

  const stripHtmlTags = (html: string): string => {
    if (typeof window === "undefined") return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const playChunk = useCallback((index: number) => {
    if (index >= utteranceQueue.current.length) {
      if (isMounted.current) {
        setIsPlaying(false);
        setIsPaused(false);
      }
      return;
    }
    const utterance = utteranceQueue.current[index];
    window.speechSynthesis.speak(utterance);
  }, []);

  const findUkMaleVoice = (voices: SpeechSynthesisVoice[]) => {
    const checks = [
      (v: SpeechSynthesisVoice) => v.name === "Google UK English Female",
      (v: SpeechSynthesisVoice) => v.name === "Daniel",
      (v: SpeechSynthesisVoice) =>
        v.lang === "en-GB" && v.name.toLowerCase().includes("male"),
      (v: SpeechSynthesisVoice) => v.lang === "en-GB" && v.default,
      (v: SpeechSynthesisVoice) => v.lang === "en-GB",
      (v: SpeechSynthesisVoice) =>
        v.lang === "en-US" && v.name.toLowerCase().includes("male"),
    ];
    for (const check of checks) {
      const voice = voices.find(check);
      if (voice) return voice;
    }
    return null;
  };

  const handleTTS = () => {
    if (!experience || !("speechSynthesis" in window) || !voicesLoaded) {
      return;
    }
    const synth = window.speechSynthesis;

    if (isPlaying) {
      if (isPaused) {
        synth.resume();
        setIsPaused(false);
      } else {
        synth.pause();
        setIsPaused(true);
      }
      return;
    }

    if (synth.speaking || synth.pending) {
      synth.cancel();
    }

    const fullText = [
      experience.title,
      `By ${experience.author}`,
      `Substances: ${substanceLinks.map((link) => link.name).join(", ")}`,
      stripHtmlTags(experience.content),
    ]
      .filter(Boolean)
      .join(". ");

    const maxChunkLength = 250;
    const chunks: string[] = [];
    let textToChunk = fullText;
    while (textToChunk.length > 0) {
      if (textToChunk.length <= maxChunkLength) {
        chunks.push(textToChunk);
        break;
      }
      let chunk = textToChunk.slice(0, maxChunkLength);
      const lastSentenceEnd = chunk.lastIndexOf(".");
      if (lastSentenceEnd > 0) {
        chunk = chunk.slice(0, lastSentenceEnd + 1);
      }
      chunks.push(chunk);
      textToChunk = textToChunk.slice(chunk.length);
    }

    const voices = synth.getVoices();
    const preferredVoice = findUkMaleVoice(voices);

    utteranceQueue.current = chunks.map((text, idx) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = preferredVoice;
      u.rate = 1.0;
      u.pitch = 0.8;
      u.onend = () => playChunk(idx + 1);
      u.onerror = (e) => {
        console.error("TTS Utterance error, skipping chunk:", e);
        playChunk(idx + 1);
      };
      return u;
    });

    if (isMounted.current) {
      setIsPlaying(true);
      setIsPaused(false);
    }
    playChunk(0);
  };

  const handleBookmark = () => {
    if (!experience) return;
    isBookmarked ? removeBookmark(experience.url) : saveBookmark(experience);
    setIsBookmarked(!isBookmarked);
  };

  const isTTSSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  return (
    <Layout>
      <div className="p-4 max-w-2xl md:max-w-7xl mx-auto text-baseColor h-full">
        <button
          onClick={() =>
            history.length > 1 ? navigate(-1) : navigate("/dashboard")
          }
          className="hidden md:flex items-center gap-1 text-baseColor hover:text-accent mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {loading || !experience ? (
          <Loader />
        ) : (
          <>
            <h1 className="text-xl font-silkscreen md:text-3xl text-accent mb-1">
              {experience.title}
            </h1>
            <p className="text-sm text-muted mb-4 font-spacegrotesk text-accent md:text-lg pl-1">
              by {experience.author} •{" "}
              {substanceLinks.map((item, idx) => (
                <span key={idx}>
                  {item.url ? (
                    <a
                      href={`/information/substance?url=${encodeURIComponent(
                        item.url
                      )}`}
                      className="underline hover:text-accent2"
                    >
                      {item.name}
                    </a>
                  ) : (
                    item.name
                  )}
                  {idx < substanceLinks.length - 1 && ", "}
                </span>
              ))}{" "}
              • {experience.metadata.published}
            </p>

            <div className="text-xs text-muted mb-4 flex flex-wrap gap-x-4 gap-y-1 pl-1 md:text-lg font-spacegrotesk text-accent2">
              <p>
                <strong>Gender:</strong> {experience.metadata.gender}
              </p>
              <p>
                <strong>Age:</strong> {experience.metadata.age}
              </p>
              <p>
                <strong>Views:</strong> {experience.metadata.views}
              </p>
            </div>

            {experience.doses?.length > 0 && (
              <div className="text-xs text-muted mb-6 space-y-1 pl-1">
                <h2 className="text-sm font-bold text-accent">Doses</h2>
                {experience.doses.map((d: any, i: number) => (
                  <p className="text-accent2 text-xs md:text-base" key={i}>
                    •{" "}
                    {[
                      d.substance,
                      d.form,
                      d.method && `via ${d.method}`,
                      d.amount && `– ${d.amount}`,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                ))}
              </div>
            )}

            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={handleBookmark}
                className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
                  isBookmarked
                    ? "bg-accent border-accent text-black"
                    : "border-accent text-accent"
                } hover:bg-accent hover:text-black text-xs font-bold transition`}
              >
                <Bookmark
                  className="w-4 h-4"
                  fill={isBookmarked ? "currentColor" : "none"}
                />
                {isBookmarked ? "Bookmarked" : "Bookmark"}
              </button>

              {isTTSSupported && (
                <div className="flex items-center gap-1">
                  {voicesLoaded ? (
                    <>
                      <button
                        onClick={handleTTS}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
                          isPlaying
                            ? "bg-accent border-accent text-black"
                            : "border-accent text-accent"
                        } hover:bg-accent hover:text-black text-xs font-bold transition`}
                        title={
                          isPlaying
                            ? isPaused
                              ? "Resume reading"
                              : "Pause reading"
                            : "Read aloud"
                        }
                      >
                        {isPlaying ? (
                          isPaused ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Pause className="w-4 h-4" />
                          )
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                        {isPlaying
                          ? isPaused
                            ? "Resume"
                            : "Pause"
                          : "Read Aloud"}
                      </button>

                      {isPlaying && (
                        <button
                          onClick={stopTTS}
                          className="flex items-center gap-1 px-2 py-1 rounded-full border border-red-400 text-red-400 hover:bg-red-400 hover:text-black text-xs font-bold transition"
                          title="Stop reading"
                        >
                          <VolumeX className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-accent2 font-spacegrotesk">
                      Loading voices...
                    </span>
                  )}
                </div>
              )}
            </div>

            <article
              dangerouslySetInnerHTML={{ __html: experience.content }}
              className="prose prose-invert whitespace-pre-wrap max-w-none font-spacegrotesk md:leading-relaxed text-sm md:text-lg text-baseColor pb-10"
            />
          </>
        )}
      </div>
    </Layout>
  );
}
