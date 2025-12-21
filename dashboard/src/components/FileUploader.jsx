import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileVideo } from 'lucide-react';
import './FileUploader.css';
import { BACKEND_URL } from '../config';

export default function FileUploader({ onFileSelected }) {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('idle'); // idle, uploading, success, error
    const [fileName, setFileName] = useState('');
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const uploadFile = async (file) => {
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('video/') && !file.name.endsWith('.mp4') && !file.name.endsWith('.mkv')) {
            alert("Please upload a video file");
            return;
        }

        setUploading(true);
        setStatus('uploading');
        setProgress(10); // Fake start
        setFileName(file.name);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${BACKEND_URL}/upload`, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setProgress(percentComplete);
                }
            };

            xhr.onload = function () {
                if (this.status === 200) {
                    const resp = JSON.parse(this.response);
                    setStatus('success');
                    setUploading(false);
                    if (onFileSelected) {
                        onFileSelected(resp.path);
                    }
                } else {
                    console.error("Upload failed", this.response);
                    setStatus('error');
                    setUploading(false);
                }
            };

            xhr.onerror = function () {
                console.error("Upload error");
                setStatus('error');
                setUploading(false);
            };

            xhr.send(formData);

        } catch (err) {
            console.error(err);
            setStatus('error');
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            uploadFile(e.target.files[0]);
        }
    };

    const onButtonClick = () => {
        inputRef.current.click();
    };

    return (
        <div
            className={`file-uploader ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
        >
            <input
                ref={inputRef}
                type="file"
                onChange={handleChange}
                accept="video/*,.mkv"
            />

            {status === 'idle' && (
                <>
                    <UploadCloud className="upload-icon" />
                    <div className="upload-text">
                        Drag video here or <strong>Browse</strong>
                    </div>
                </>
            )}

            {status === 'uploading' && (
                <>
                    <FileVideo className="upload-icon animate-pulse" />
                    <div className="upload-text">Uploading {fileName}...</div>
                    <div className="upload-progress" style={{ width: `${progress}%` }}></div>
                </>
            )}

            {status === 'success' && (
                <div className="upload-success animate-pop-in">
                    <CheckCircle size={24} />
                    <span>Selected: {fileName}</span>
                </div>
            )}

            {status === 'error' && (
                <div className="upload-error animate-pop-in">
                    <AlertCircle size={24} />
                    <span>Upload failed. Try again.</span>
                </div>
            )}
        </div>
    );
}
