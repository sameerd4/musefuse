import SwiftUI

@main
struct MuseFuseApp: App {
    @StateObject private var authManager = AuthManager.shared
    
    var body: some Scene {
        WindowGroup {
            if authManager.isAuthenticated {
                MainTabView()
                    .environmentObject(authManager)
            } else {
                ContentView()
                    .environmentObject(authManager)
            }
        }
    }
} 