import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title:"MinuteMark — team time tracking", 
    description:"Private time tracking for focused teams"
};

export default function RootLayout ( {children} : {children:React.ReactNode} ) {
    return <html lang="en"><body>{children}</body></html>;
}
