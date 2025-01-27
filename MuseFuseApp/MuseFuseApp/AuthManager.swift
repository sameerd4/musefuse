import Foundation

class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var token: String?
    
    private let tokenKey = "auth_token"
    static let shared = AuthManager()
    
    init() {
        token = UserDefaults.standard.string(forKey: tokenKey)
        isAuthenticated = token != nil
    }
    
    func login(username: String, password: String) async throws {
        let url = URL(string: "http://192.168.86.38:5001/api/v1/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["username": username, "password": password]
        request.httpBody = try JSONEncoder().encode(body)
        
        // Print request for debugging
        print("Sending request to: \(url)")
        if let bodyString = String(data: request.httpBody!, encoding: .utf8) {
            print("Request body: \(bodyString)")
        }
        
        let (data, urlResponse) = try await URLSession.shared.data(for: request)
        
        // Print response for debugging
        if let httpResponse = urlResponse as? HTTPURLResponse {
            print("HTTP Status: \(httpResponse.statusCode)")
        }
        if let responseString = String(data: data, encoding: .utf8) {
            print("Response: \(responseString)")
        }
        
        let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
        
        if !loginResponse.error, let token = loginResponse.token {
            DispatchQueue.main.async {
                self.token = token
                UserDefaults.standard.set(token, forKey: self.tokenKey)
                self.isAuthenticated = true
            }
        } else {
            print("Login failed: \(loginResponse.message ?? "No error message")")
            throw AuthError.invalidCredentials
        }
    }
    
    func logout() {
        token = nil
        UserDefaults.standard.removeObject(forKey: tokenKey)
        isAuthenticated = false
    }
}

struct LoginResponse: Codable {
    let error: Bool
    let token: String?
    let message: String?
    let expiresIn: Int?
}

enum AuthError: Error {
    case invalidCredentials
    case networkError
} 