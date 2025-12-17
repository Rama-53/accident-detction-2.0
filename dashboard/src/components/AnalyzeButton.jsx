import { useRef, useState } from "react";
import { ScanEye } from "lucide-react"; // Matching project icon set
import { motion } from "framer-motion";
import "./AnalyzeButton.css";

const TARGET_TEXT = "Analyze Stream";
const CYCLES_PER_LETTER = 2;
const SHUFFLE_TIME = 50;
const CHARS = "!@#$%^&*():{};|,.<>/?";

export default function AnalyzeButton({ onClick }) {
    const intervalRef = useRef(null);
    const [text, setText] = useState(TARGET_TEXT);

    const scramble = () => {
        let pos = 0;

        intervalRef.current = setInterval(() => {
            const scrambled = TARGET_TEXT.split("")
                .map((char, index) => {
                    if (pos / CYCLES_PER_LETTER > index) {
                        return char;
                    }

                    const randomCharIndex = Math.floor(Math.random() * CHARS.length);
                    const randomChar = CHARS[randomCharIndex];

                    return randomChar;
                })
                .join("");

            setText(scrambled);
            pos++;

            if (pos >= TARGET_TEXT.length * CYCLES_PER_LETTER) {
                stopScramble();
            }
        }, SHUFFLE_TIME);
    };

    const stopScramble = () => {
        clearInterval(intervalRef.current || undefined);
        setText(TARGET_TEXT);
    };

    return (
        <motion.button
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.975 }}
            onMouseEnter={scramble}
            onMouseLeave={stopScramble}
            onClick={onClick}
            className="analyze-btn"
        >
            <div className="analyze-content">
                <ScanEye size={16} />
                <span>{text}</span>
            </div>
            <motion.span
                initial={{ y: "100%" }}
                animate={{ y: "-100%" }}
                transition={{
                    repeat: Infinity,
                    repeatType: "loop", // Adjusted from 'mirror' to 'loop' for continuous sweep
                    duration: 1.5,
                    ease: "linear",
                }}
                className="analyze-gradient-sweep"
            />
        </motion.button>
    );
}
