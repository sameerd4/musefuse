import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        TabView {
            PhotoGalleryView()
                .tabItem {
                    Label("Photos", systemImage: "photo.on.rectangle")
                }
            
            PhotoUploadView()
                .tabItem {
                    Label("Upload", systemImage: "square.and.arrow.up")
                }
            
            Button("Logout") {
                authManager.logout()
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
        }
    }
} 