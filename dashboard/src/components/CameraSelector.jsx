import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Camera, FileVideo, HardDrive, Radio, Youtube } from 'lucide-react';
import './CameraSelector.css';

export function CameraSelector({
    options = [],
    value,
    onChange,
    placeholder = "Select source"
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.id === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (option) => {
        const type = option.type || 'camera';
        const id = option.id || '';

        if (type === 'file' || id.includes('file')) return <FileVideo size={16} />;
        if (id.includes('rtsp')) return <Radio size={16} />;
        if (id.includes('youtube') || type === 'youtube') return <Youtube size={16} />;
        return <Camera size={16} />;
    };

    return (
        <div className="camera-selector-container" ref={containerRef}>
            <button
                className={`camera-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <div className="trigger-content">
                    {selectedOption ? (
                        <>
                            <span className="source-icon">{getIcon(selectedOption)}</span>
                            <span className="source-label">{selectedOption.label || selectedOption.name || selectedOption.id}</span>
                        </>
                    ) : (
                        <span className="placeholder">{placeholder}</span>
                    )}
                </div>
                <ChevronDown
                    size={16}
                    className={`chevron ${isOpen ? 'rotate' : ''}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="camera-dropdown-menu"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                        <div className="dropdown-scroll">
                            {options.length === 0 ? (
                                <div className="no-options">No sources available</div>
                            ) : (
                                options.map((option) => (
                                    <button
                                        key={option.id}
                                        className={`dropdown-item ${value === option.id ? 'selected' : ''}`}
                                        onClick={() => {
                                            onChange(option.id);
                                            setIsOpen(false);
                                        }}
                                        type="button"
                                    >
                                        <div className="item-content">
                                            <span className="item-icon">{getIcon(option)}</span>
                                            <span className="item-label">{option.label || option.name || option.id}</span>
                                        </div>
                                        {value === option.id && <Check size={14} className="check-icon" />}
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
