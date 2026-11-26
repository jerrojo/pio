import SwiftUI

// Pío for iPhone. The practice itself lives at pio.today; this app gives it a
// home on the phone: its own icon and launch, the microphone asked for once,
// sound through the speaker, vibration, and a calm screen when there is no
// connection.
@main
struct PioApp: App {
    var body: some Scene {
        WindowGroup {
            Root()
                .preferredColorScheme(.dark)
        }
    }
}

struct Root: View {
    @StateObject private var browser = Browser()
    @Environment(\.scenePhase) private var scene

    var body: some View {
        ZStack {
            Color("Night").ignoresSafeArea()
            WebScreen(browser: browser)
                .ignoresSafeArea()
                .opacity(browser.state == .ready ? 1 : 0)
            switch browser.state {
            case .loading:
                Waiting()
            case .failed:
                Offline { browser.load() }
            case .ready:
                EmptyView()
            }
        }
        .animation(.easeOut(duration: 0.25), value: browser.state)
        .onChange(of: scene) { _, now in
            // Back from the background after a failed start: try again.
            if now == .active, browser.state == .failed { browser.load() }
        }
    }
}

// The same picture as the launch screen, so opening the app is one motion.
struct Waiting: View {
    @State private var breathing = false

    var body: some View {
        Image("Mascot")
            .resizable()
            .scaledToFit()
            .frame(width: 187, height: 187)
            .scaleEffect(breathing ? 1.03 : 0.98)
            .animation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true), value: breathing)
            .onAppear { breathing = true }
            .accessibilityHidden(true)
    }
}

struct Offline: View {
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image("Mascot")
                .resizable()
                .scaledToFit()
                .frame(width: 150, height: 150)
                .saturation(0.6)
                .accessibilityHidden(true)
            Text("offline.title")
                .font(.system(.title2, design: .rounded).weight(.bold))
                .foregroundStyle(.white)
            Text("offline.body")
                .font(.system(.body, design: .rounded))
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
            Button(action: retry) {
                Text("offline.retry")
                    .font(.system(.headline, design: .rounded))
                    .foregroundStyle(Color(red: 0.08, green: 0.21, blue: 0.16))
                    .padding(.horizontal, 28)
                    .frame(minHeight: 52)
                    .background(Color("AccentColor"), in: Capsule())
            }
            .padding(.top, 8)
        }
        .padding(32)
    }
}
