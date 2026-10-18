import type {
  Entry,
  Project,
  Workspace
} from "./types";

const base=process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000/api";

const token = () => (
  typeof window !== "undefined" 
  ? localStorage.getItem(
    "chrona_token"
  ) : null
);

const workspace = () => (
  typeof window !== "undefined" 
  ? localStorage.getItem(
    "chrona_workspace"
  ) : null
);

async function request<T>(
  path: string,
  options: RequestInit = {})
  :Promise<T> {
  const headers: Record<string,string> = {
    "Content-Type": "application/json",
    ...(
      options.headers as Record<string,string>
      || {}
    )
  };
  
  if (token()) {
    headers.Authorization = `Token ${token()}`
  };
  if (workspace()) {
    headers["X-Workspace-ID"]=workspace()!
  };

  const response = await fetch(
    `${base}${path}`,
    {...options,headers}
  );

  if (!response.ok) {
    const body=await response.json().catch( () => (
      {
        detail:"Request failed"
      }
    )
  );
  throw new Error(
    body.detail
    ||Object.values(body).flat().join(" ")
  );}

  return response.status === 204 ? undefined as T:response.json();
}

export const api={
  login : (
    username: string,
    password: string
  ) => request<{token:string}> (
    "/auth/login/", {
      method:"POST",
      body:JSON.stringify({username,password})
    }
  ),

  register : (
    username: string,
    email: string,
    password: string
  ) => request<{token: string}>(
    "/auth/register/", {
      method:"POST",
      body:JSON.stringify({username,email,password})
    }
  ),

  workspaces : () => request<Workspace[]>(
    "/workspaces/"
  ).then(
    v => (
      v as unknown as {results?:Workspace[]}        
    ).results || v
  ),

  invite : (
    id:number,
    email:string
  ) => request<Workspace>(
    `/workspaces/${id}/invite/`, {
      method:"POST",
      body:JSON.stringify({email})
    }
  ),

  projects : () => request<Project[]>(
    "/projects/"
  ).then(
    v => (
      v as unknown as {results?:Project[]}
    ).results || v
  ),

  entries : () => request<Entry[]>(
    "/entries/"
  ).then(
    v => (
      v as unknown as {results?:Entry[]}
    ).results || v
  ),

  start : (
    description: string,
    project: number | null
  ) => request<Entry>(
    "/entries/", {
      method:"POST",
      body:JSON.stringify({
        description,
        project,
        start : new Date().toISOString()
      })
    }
  ),

  stop : ( id: number ) => request<Entry>(
    `/entries/${id}/stop/`, {
      method:"POST"
    }
  ),

  manual : (
    description: string,
    project: number | null,
    start: string,
    stop: string
  ) => request<Entry>(
    "/entries/", {
      method:"POST",
      body:JSON.stringify({
        description,
        project,
        start,
        stop,
        duration_seconds : Math.floor(
          new Date(stop).getTime() - new Date(start).getTime()
        )/1000
      })
    }
  ),

  remove : ( id: number ) => request<void>(
    `/entries/${id}/`, {
      method:"DELETE"
    }
  ),
};
