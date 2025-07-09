import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Upload,
  FileJson,
  History,
  LogOut,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../assets/images/logo.png";
import api from "../lib/api"

interface FileRecord {
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
  inserted_count: number;
  skipped_count: number;
}

const AdminPanel = () => {
  const [uploadedFiles, setUploadedFiles] = useState<FileRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    if (!token) {
      navigate("/admin-login");
    }
  }, [navigate]);

  if (!token) return

  const fetchHistory = async () => {
    try {
      const res = await api.get("/file_records");
      setUploadedFiles(res.data?.message);
    } catch (error) {
      toast.error("Failed to load upload history");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/json") {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB.");
        return;
      }
      setSelectedFile(file);
    } else {
      toast.error("Please select a valid JSON file.");
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile) {
      toast.error("Please select a JSON file first.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await api.post("/upload_file/", formData);

      toast.success("Uploaded successfully");

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh file history
      const refreshed = await api.get("/file_records");
      setUploadedFiles(refreshed.data.message);
    } catch (error) {
      const msg = error.response?.data?.message || "Upload failed.";
      toast.error(msg);
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    setTimeout(() => {
      navigate("/admin-login");
    }, 500);
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button> */}
              <div className="flex items-center gap-4">
                <img src={logo} alt="KU_LOGO" className="w-14" />
                <div><h1 className="text-2xl font-bold text-black bg-clip-text text-transparent">
                  Admin Panel
                </h1>
                  <p className="text-gray-600">University Of Karachi Chatbot</p></div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button asChild>
                <Link to="/chat">Go to Chat</Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload JSON File */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload JSON File</span>
              </CardTitle>
              <CardDescription>
                Upload configuration files for the chatbot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="json-upload">Select JSON File</Label>
                <div className="flex flex-row gap-2">
                  <Input
                    id="json-upload"
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                    ref={fileInputRef}
                  />
                  <Button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>Supported formats: JSON files only</p>
                <p>Maximum file size: 10MB</p>
              </div>
            </CardContent>
          </Card>

          {/* Upload History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Upload History</span>
              </CardTitle>
              <CardDescription>
                Recently uploaded JSON files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {uploadedFiles?.length ? uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileJson className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">{file?.file_name}</p>
                        <p className="text-xs text-gray-500 mt-[2px]">
                          {new Date(file?.uploaded_at).toLocaleString()}
                        </p>

                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500"><b>By: </b>{file?.uploaded_by}</span>
                      <p className="text-xs text-gray-500">
                        <b>Inserted:  </b> {file?.inserted_count},  <b>Skipped:  </b>{""}
                        {file?.skipped_count}
                      </p>
                    </div>
                  </div>
                )) : "No recent data"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
