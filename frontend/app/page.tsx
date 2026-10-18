"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Login } from "@/components/Login";
export default function Home () {
    const [ ready, setReady ] = useState<boolean>(false),
    [ authenticated, setAuthenticated ] = useState<boolean>(false);
    useEffect( () => {
        setAuthenticated(
            !!localStorage.getItem("chrona_token")
        );
        setReady(true)
    }, []);
    if ( !ready ) {
        return null
    };
    return (
        authenticated ? <Dashboard/> : 
        <Login onDone={ () => setAuthenticated(true) }/>
    )
}
