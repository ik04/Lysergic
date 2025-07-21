import { useEffect } from "react";
import { useLocation } from "@remix-run/react";

export const useCancelSpeechOnNavigate = () => {
  const location = useLocation();

  useEffect(() => {
    window.speechSynthesis.cancel();
    console.log("[TTS] Speech cancelled on route change");
  }, [location]);
};
