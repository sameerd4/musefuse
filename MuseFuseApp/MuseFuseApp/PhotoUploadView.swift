import SwiftUI
import PhotosUI

struct PhotoUploadView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedItem: PhotosPickerItem?
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var isUploading = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                if isUploading {
                    ProgressView("Uploading...")
                } else {
                    PhotosPicker(
                        selection: $selectedItem,
                        matching: .images,
                        photoLibrary: .shared()
                    ) {
                        VStack {
                            Image(systemName: "photo.badge.plus")
                                .font(.system(size: 50))
                                .foregroundColor(.blue)
                            Text("Select Photo")
                                .foregroundColor(.blue)
                        }
                        .frame(maxWidth: .infinity, maxHeight: 200)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [5]))
                                .foregroundColor(.gray)
                        )
                    }
                    .onChange(of: selectedItem) { _ in
                        if let item = selectedItem {
                            Task {
                                await uploadPhoto(item)
                            }
                        }
                    }
                }
            }
            .padding()
            .navigationTitle("Upload Photo")
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage)
            }
        }
    }
    
    private func uploadPhoto(_ item: PhotosPickerItem) async {
        guard let token = authManager.token else { return }
        
        do {
            isUploading = true
            
            // Get image data from picker item
            guard let imageData = try await item.loadTransferable(type: Data.self) else {
                print("Failed to load image data")
                throw URLError(.badServerResponse)
            }
            
            guard let uiImage = UIImage(data: imageData) else {
                throw URLError(.badServerResponse)
            }
            
            // Create high quality version of original (just compress slightly)
            guard let originalImageData = uiImage.jpegData(compressionQuality: 0.9) else {
                throw URLError(.badServerResponse)
            }
            
            // Create separate thumbnail
            let thumbnailSize: CGFloat = 300  // Max width/height for thumbnail
            let scale = min(thumbnailSize/uiImage.size.width, thumbnailSize/uiImage.size.height, 1.0)
            let newSize = CGSize(width: uiImage.size.width * scale, height: uiImage.size.height * scale)
            
            let renderer = UIGraphicsImageRenderer(size: newSize)
            let thumbnailImage = renderer.image { context in
                uiImage.draw(in: CGRect(origin: .zero, size: newSize))
            }
            
            guard let thumbnailData = thumbnailImage.jpegData(compressionQuality: 0.8) else {
                throw URLError(.badServerResponse)
            }
            
            print("Original size: \(originalImageData.count) bytes")
            print("Thumbnail size: \(thumbnailData.count) bytes")
            
            // Create multipart form data
            let boundary = UUID().uuidString
            var request = URLRequest(url: URL(string: "http://192.168.86.38:5001/api/v1/upload")!)
            request.httpMethod = "POST"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 60
            
            var body = Data()
            // Add the original image
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(originalImageData)  // Use original high quality image
            body.append("\r\n".data(using: .utf8)!)
            
            // Add the thumbnail
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"thumbnail\"; filename=\"thumbnail.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(thumbnailData)  // Use thumbnail data
            body.append("\r\n".data(using: .utf8)!)
            body.append("--\(boundary)--\r\n".data(using: .utf8)!)
            
            request.httpBody = body
            
            print("Sending upload request...")
            let (data, urlResponse) = try await URLSession.shared.data(for: request)
            
            // Print response for debugging
            if let httpResponse = urlResponse as? HTTPURLResponse {
                print("Upload HTTP Status: \(httpResponse.statusCode)")
            }
            if let responseString = String(data: data, encoding: .utf8) {
                print("Upload Response: \(responseString)")
            }
            
            let uploadResponse = try JSONDecoder().decode(UploadResponse.self, from: data)
            
            DispatchQueue.main.async {
                isUploading = false
                selectedItem = nil
                if uploadResponse.error {
                    showError = true
                    errorMessage = uploadResponse.message ?? "Upload failed"
                }
            }
            
        } catch {
            print("Upload error: \(error)")
            DispatchQueue.main.async {
                isUploading = false
                showError = true
                errorMessage = "Failed to upload photo: \(error.localizedDescription)"
            }
        }
    }
}

struct UploadResponse: Codable {
    let error: Bool
    let message: String?
    let filename: String?
    let s3_url: String?
    let thumbnail_url: String?
} 