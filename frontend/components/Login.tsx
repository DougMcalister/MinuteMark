"use client";

import { SubmitEvent, useState} from "react";
import { api } from "@/lib/api";
export function Login ( {onDone}: {onDone: () => void} ) {
    const [ register, setRegister ] = useState<boolean>(false),
    [ busy , setBusy] = useState<boolean>(false),
    [ error, setError ] = useState<string>("");
    async function submit ( e:SubmitEvent<HTMLFormElement> ) {
        e.preventDefault();
        setBusy(true);
        setError("");
        const data = new FormData(e.currentTarget);
        try {
            const r=register ? await api.register(
                String(data.get("username")),
                String(data.get("email")),
                String(data.get("password"))
            ) :await api.login(
                String(data.get("username")),
                String(data.get("password")));
                localStorage.setItem("chrona_token",r.token);
                onDone();
            } catch (err) {
                setError(
                    err instanceof Error ? err.message: "Unable to sign in"
                );
            } finally {
                setBusy(false)
            }
        }
    return (
        <main 
            className="
                min-h-screen 
                grid lg:grid-cols-2 
                bg-ink"
            >
                <section 
                    className="
                        hidden 
                        lg:flex 
                        p-16 
                        flex-col 
                        justify-between 
                        text-white 
                        bg-[radial-gradient(circle_at_15%_15%,#6551e8_0,transparent_42%),
                        radial-gradient(circle_at_80%_80%,#ff6b57_0,transparent_32%)]
                    "
                >
                    <b className="text-2xl">
                        ◒ MinuteMark
                    </b>
                    <div>
                        <p 
                            className="
                                text-violet-200
                                uppercase 
                                tracking-[.3em] 
                                text-xs
                            "
                        >
                            Time, made visible
                        </p>
                        <h1 
                            className="
                                text-6xl
                                font-semibold
                                leading-tight
                                max-w-xl 
                                mt-5
                            "
                        >
                            Protect the hours that move your project forward.
                        </h1>
                        <p 
                            className="
                                text-white/60 
                                mt-6 
                                max-w-md 
                                text-lg
                                "
                        >
                            A calm, private workspace for small teams. Track less. Understand more.
                        </p>
                    </div>
                    <p 
                        className="
                            text-white/40
                            text-sm
                        "
                    >
                        Built for your team, not the attention economy.
                    </p>
                </section>
            <section 
                className="
                    bg-paper 
                    flex items-center 
                    justify-center 
                    p-6
                "
            >
                <form 
                    onSubmit={ submit } 
                    className="
                        w-full
                        max-w-md
                        bg-white
                        p-8
                        sm:p-10
                        rounded-[2rem]
                        shadow-soft
                    "
            >
                <div 
                    className="
                        lg:hidden
                        font-bold
                        text-xl
                        mb-8
                    "
                >
                    ◒ MinuteMark
                </div>
                <p
                    className="
                        text-violet
                        text-sm
                        font-semibold
                        "
                >
                    PRIVATE TEAM WORKSPACE
                </p>
                <h2
                    className="
                        text-4xl
                        font-semibold
                        mt-2
                    "
                >
                    {register ? "Create your space":"Welcome back"}
                </h2>
                <p 
                    className="
                        text-slate-500
                        mt-3
                        mb-8
                    "
                >
                    {register ? "Start a focused home for your project.":"Sign in to keep the momentum going."}
                </p>
                <label className="text-sm font-medium">
                    Username
                <input 
                    name="username" 
                    required 
                    className="
                        mt-2 mb-5
                        w-full
                        border
                        border-slate-200
                        rounded-xl 
                        px-4 py-3 
                        outline-none 
                        focus:ring-2 
                        focus:ring-violet/30
                    "
                />
                </label>
                { register && (
                    <label className="text-sm font-medium">
                        Email
                        <input 
                            name="email"
                            type="email"
                            required 
                            className="
                                mt-2 mb-5
                                w-full
                                border
                                border-slate-200
                                rounded-xl
                                px-4 py-3
                                outline-none
                                focus:ring-2
                                focus:ring-violet/30
                                "
                        />
                    </label>
                )}
                <label className="text-sm font-medium">
                    Password
                    <input 
                        name="password" 
                        type="password" 
                        minLength={8} 
                        required 
                        className="
                            mt-2 mb-3
                            w-full
                            border
                            border-slate-200
                            rounded-xl
                            px-4 py-3
                            outline-none
                            focus:ring-2
                            focus:ring-violet/30
                            "
                        />    
                    </label>
                    { error && (
                        <p 
                            role="alert" 
                            className="
                                text-coral
                                text-sm my-3
                            "
                        >
                            {error}
                        </p>
                    )}
                    <button 
                        disabled={busy}
                        className="
                            w-full
                            mt-5
                            bg-ink
                            text-white
                            py-3.5
                            rounded-xl
                            font-semibold
                            hover:opacity-90
                        "
                    >
                        {
                            busy ? "One moment…" :
                            register ? "Create workspace" : "Sign in"
                        }
                    </button>
                    <button 
                        type="button"
                        onClick={
                            ()=>setRegister(!register)
                        } 
                        className="
                            w-full
                            text-violet
                            text-sm
                            mt-5
                            "
                    >
                        {
                            register ? "Already have an account? Sign in" :
                            "New here? Create an account"
                        }
                    </button>
                </form>
            </section>
        </main>
    );
}
