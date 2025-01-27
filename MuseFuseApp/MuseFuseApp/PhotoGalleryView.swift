import SwiftUI

struct Photo: Codable, Identifiable {
    let id = UUID()  // For SwiftUI list
    let filename: String
    let url: String
    let thumbnail_url: String
    let upload_time: String
    let owner: String
}

struct PhotoGalleryView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var photos: [Photo] = []
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 10) {
                    ForEach(photos) { photo in
                        AsyncImage(url: URL(string: photo.thumbnail_url)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(height: 150)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
                .padding()
            }
            .navigationTitle("Photos")
            .onAppear {
                Task {
                    await fetchPhotos()
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage)
            }
        }
    }
    
    func fetchPhotos() async {
        guard let token = authManager.token else { return }
        
        let url = URL(string: "http://192.168.86.38:5001/api/v1/photos")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let response = try JSONDecoder().decode(PhotoResponse.self, from: data)
            if !response.error {
                DispatchQueue.main.async {
                    self.photos = response.data
                }
            }
        } catch {
            DispatchQueue.main.async {
                showError = true
                errorMessage = "Failed to load photos"
            }
        }
    }
}

struct PhotoResponse: Codable {
    let error: Bool
    let data: [Photo]
} 