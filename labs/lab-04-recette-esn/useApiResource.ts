// useApiResource.ts — DONNÉ, EXISTANT dans la codebase mission. Ne se modifie pas. Le hook
// de fetch générique que toute feature de cette codebase utilise (au lieu d'un useEffect+
// fetch réécrit à chaque fois) — voir son usage dans ExampleWidget.tsx.
import { useEffect, useState } from "react";

export type ApiResourceState<T> =
  | { status: "loading"; data: null }
  | { status: "success"; data: T }
  | { status: "error"; data: null };

export function useApiResource<T>(url: string): ApiResourceState<T> {
  const [state, setState] = useState<ApiResourceState<T>>({ status: "loading", data: null });

  useEffect(() => {
    let ignore = false;
    setState({ status: "loading", data: null });
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
        return res.json();
      })
      .then((data: T) => {
        if (!ignore) setState({ status: "success", data });
      })
      .catch(() => {
        if (!ignore) setState({ status: "error", data: null });
      });
    return () => {
      ignore = true;
    };
  }, [url]);

  return state;
}
