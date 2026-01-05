import { useReducer, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { toast } from "../../hooks/use-toast";
import type { Database } from "../lib/database.types";

type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitors: Database["public"]["Tables"]["visitors"]["Row"];
  hosts: Database["public"]["Tables"]["hosts"]["Row"];
};

type State = {
  scanResult: string | null;
  visit: Visit | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  checkingAuth: boolean;
  scannerReady: boolean;
};

type Action =
  | { type: "SET_SCAN_RESULT"; payload: string | null }
  | { type: "SET_VISIT"; payload: Visit | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_IS_AUTHENTICATED"; payload: boolean }
  | { type: "SET_CHECKING_AUTH"; payload: boolean }
  | { type: "SET_SCANNER_READY"; payload: boolean }
  | { type: "RESET" };

const initialState: State = {
  scanResult: null,
  visit: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  checkingAuth: true,
  scannerReady: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_SCAN_RESULT":
      return { ...state, scanResult: action.payload };
    case "SET_VISIT":
      return { ...state, visit: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_IS_AUTHENTICATED":
      return { ...state, isAuthenticated: action.payload };
    case "SET_CHECKING_AUTH":
      return { ...state, checkingAuth: action.payload };
    case "SET_SCANNER_READY":
      return { ...state, scannerReady: action.payload };
    case "RESET":
      return {
        ...initialState,
        isAuthenticated: state.isAuthenticated,
        checkingAuth: false,
      };
    default:
      return state;
  }
}

export function useScanQrCode() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth check error:", error);
          dispatch({ type: "SET_IS_AUTHENTICATED", payload: false });
          dispatch({ type: "SET_ERROR", payload: "Authentication error. Please try logging in again." });
        } else if (session?.user) {
          console.log("User authenticated:", session.user.id);
          dispatch({ type: "SET_IS_AUTHENTICATED", payload: true });
          dispatch({ type: "SET_ERROR", payload: null });
        } else {
          console.log("No active session");
          dispatch({ type: "SET_IS_AUTHENTICATED", payload: false });
          dispatch({ type: "SET_ERROR", payload: "You must be logged in to scan QR codes" });
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        dispatch({ type: "SET_IS_AUTHENTICATED", payload: false });
        dispatch({ type: "SET_ERROR", payload: "Failed to verify authentication" });
      } finally {
        dispatch({ type: "SET_CHECKING_AUTH", payload: false });
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: "SET_IS_AUTHENTICATED", payload: !!session?.user });
      if (!session?.user) {
        dispatch({ type: "SET_ERROR", payload: "You must be logged in to scan QR codes" });
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Start scanner when authenticated
  useEffect(() => {
    if (!state.isAuthenticated || state.checkingAuth) {
      return;
    }

    const qrCodeDivId = "qr-reader";
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        scanner = new Html5Qrcode(qrCodeDivId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            dispatch({ type: "SET_SCAN_RESULT", payload: decodedText });
            if (scanner?.isScanning) {
              scanner.stop().catch(console.error);
            }
          },
          () => {}
        );
        
        dispatch({ type: "SET_SCANNER_READY", payload: true });
      } catch (err) {
        console.error("Scanner error:", err);
        dispatch({ type: "SET_ERROR", payload: "Failed to start QR code scanner. Please ensure camera permissions are granted." });
      }
    };

    startScanner();

    return () => {
      if (scanner?.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [state.isAuthenticated, state.checkingAuth]);

  // Fetch visit details when QR code is scanned
  useEffect(() => {
    if (!state.scanResult || !state.isAuthenticated) return;

    const fetchVisitDetails = async () => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      dispatch({ type: "SET_VISIT", payload: null });

      try {
        let visitId: string;
        try {
          const parsed = JSON.parse(state.scanResult!);
          visitId = parsed.visitId;
        } catch (parseError) {
          visitId = state.scanResult!.trim();
        }

        if (!visitId) {
          throw new Error("Invalid QR code format: visitId missing");
        }

        const { data: visitData, error: visitError } = await supabase
          .from("visits")
          .select(`
            *,
            visitors:visitor_id (*),
            hosts:host_id (*)
          `)
          .eq("id", visitId)
          .single();

        if (visitError) {
          throw new Error(`Database error: ${visitError.message}`);
        }

        if (!visitData) {
          throw new Error("Visit not found");
        }

        if (visitData.status === "checked-in") {
          dispatch({ type: "SET_ERROR", payload: "This visitor is already checked in!" });
          dispatch({ type: "SET_VISIT", payload: visitData as Visit });
          return;
        }

        if (visitData.status !== "approved") {
          throw new Error(`Visit status is '${visitData.status}'. Only approved visits can be checked in.`);
        }

        if (visitData.valid_until) {
          const validUntil = new Date(visitData.valid_until);
          if (validUntil < new Date()) {
            throw new Error("This visit has expired");
          }
        }

        const { data: updatedVisit, error: updateError } = await supabase
          .from("visits")
          .update({
            check_in_time: new Date().toISOString(),
            status: "checked-in",
          })
          .eq("id", visitId)
          .select(`
            *,
            visitors:visitor_id (*),
            hosts:host_id (*)
          `)
          .single();

        if (updateError) {
          throw new Error(`Failed to check in: ${updateError.message}`);
        }

        toast({
          title: "Success!",
          description: "Visitor checked in successfully",
        });
        
        dispatch({ type: "SET_VISIT", payload: updatedVisit as Visit });
      } catch (err: unknown) {
        let errorMessage = "Failed to fetch visit details";
        
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    fetchVisitDetails();
  }, [state.scanResult, state.isAuthenticated]);

  const handleScanAnother = async () => {
    dispatch({ type: "RESET" });
  };

  return { state, handleScanAnother };
}
