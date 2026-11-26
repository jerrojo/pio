import AVFoundation
import SwiftUI
import UIKit
import WebKit

// The page Pío lives on, and everything the phone does for it.
@MainActor
final class Browser: NSObject, ObservableObject {
    enum State { case loading, ready, failed }

    static let home = URL(string: "https://pio.today/")!

    @Published var state: State = .loading
    let view: WKWebView

    override init() {
        let setup = WKWebViewConfiguration()
        // Pío's voice plays inside the page, and by itself after each turn.
        setup.allowsInlineMediaPlayback = true
        setup.mediaTypesRequiringUserActionForPlayback = []
        // The page can tell it is running inside the app.
        setup.applicationNameForUserAgent = "PioApp/1.0"
        view = WKWebView(frame: .zero, configuration: setup)
        super.init()
        setup.userContentController.add(Relay(self), name: "pio")
        view.navigationDelegate = self
        view.uiDelegate = self
        // The page paints its own background and keeps clear of the notch.
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.backgroundColor = .clear
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.scrollView.bounces = false
        view.allowsBackForwardNavigationGestures = false
        view.allowsLinkPreview = false
        #if DEBUG
        view.isInspectable = true
        #endif
        tuneSound()
        #if DEBUG
        rehearse(setup.userContentController)
        #endif
        load()
    }

    #if DEBUG
    // For trying the app without touching it, never in the App Store build.
    // PIO_PAIR="es-MX:de-DE" chooses the languages; PIO_TAP=1 taps Hablar once
    // the page is up; PIO_SCRIPT is a file of JavaScript to run before the
    // page starts (the browser bots' fake microphone and server).
    private func rehearse(_ page: WKUserContentController) {
        let wish = ProcessInfo.processInfo.environment
        var first = ""
        if let pair = wish["PIO_PAIR"]?.split(separator: ":"), pair.count == 2 {
            first += "try{localStorage.setItem('pio.preferences.v3',JSON.stringify({version:3,native:'\(pair[0])',target:'\(pair[1])'}))}catch(e){};"
        }
        if let path = wish["PIO_SCRIPT"], let script = try? String(contentsOfFile: path, encoding: .utf8) {
            first += script
        }
        if !first.isEmpty {
            page.addUserScript(WKUserScript(source: first, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        if wish["PIO_TAP"] != nil {
            let tap = "setTimeout(()=>document.querySelector('.mic-button')?.click(),2500)"
            page.addUserScript(WKUserScript(source: tap, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
    }
    #endif

    func load() {
        state = .loading
        view.load(URLRequest(url: Browser.home, timeoutInterval: 20))
    }

    // A session speaks and listens in turns. Sound goes to the speaker (or to
    // headphones when they are on), never to the quiet earpiece.
    private func tuneSound() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(
            .playAndRecord,
            mode: .default,
            options: [.defaultToSpeaker, .allowBluetoothHFP, .allowBluetoothA2DP]
        )
        NotificationCenter.default.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: nil,
            queue: .main
        ) { _ in
            let session = AVAudioSession.sharedInstance()
            let earpiece = session.currentRoute.outputs.contains { $0.portType == .builtInReceiver }
            if earpiece { try? session.overrideOutputAudioPort(.speaker) }
        }
    }

    // What the page asks the phone to do. Today: vibrate.
    fileprivate func received(_ body: Any) {
        guard let message = body as? [String: Any], let pattern = message["haptic"] else { return }
        if let steps = pattern as? [Any], steps.count > 1 {
            // A pattern marks a phrase said well.
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } else {
            let length = (pattern as? NSNumber)?.doubleValue
                ?? ((pattern as? [Any])?.first as? NSNumber)?.doubleValue
                ?? 10
            UIImpactFeedbackGenerator(style: length > 11 ? .medium : .light).impactOccurred()
        }
    }
}

// Keeps the page's messages from holding the browser in memory.
private final class Relay: NSObject, WKScriptMessageHandler {
    weak var browser: Browser?
    init(_ browser: Browser) { self.browser = browser }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        let body = message.body
        Task { @MainActor in self.browser?.received(body) }
    }
}

extension Browser: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        state = .ready
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        failed(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        failed(error)
    }

    private func failed(_ error: Error) {
        // Leaving a page for another is not a failure.
        if (error as NSError).code == NSURLErrorCancelled { return }
        if state != .ready { state = .failed }
    }

    // The system closed the page to free memory: bring it back.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        load()
    }

    // Pío's own pages stay in the app; anything else opens in the browser.
    func webView(
        _ webView: WKWebView,
        decidePolicyFor action: WKNavigationAction
    ) async -> WKNavigationActionPolicy {
        guard let url = action.request.url else { return .cancel }
        if url.scheme == "about" || url.host == Browser.home.host { return .allow }
        if action.targetFrame?.isMainFrame != false, ["http", "https", "mailto"].contains(url.scheme ?? "") {
            await UIApplication.shared.open(url)
        }
        return .cancel
    }
}

extension Browser: WKUIDelegate {
    // The phone has already asked for the microphone once, in the system's
    // own words. Pío's page is not asked a second time on every visit.
    func webView(
        _ webView: WKWebView,
        decideMediaCapturePermissionsFor origin: WKSecurityOrigin,
        initiatedBy frame: WKFrameInfo,
        type: WKMediaCaptureType
    ) async -> WKPermissionDecision {
        origin.host == Browser.home.host && type == .microphone ? .grant : .deny
    }

    // A link meant for a new window opens in the browser instead.
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for action: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = action.request.url { UIApplication.shared.open(url) }
        return nil
    }
}

struct WebScreen: UIViewRepresentable {
    let browser: Browser

    func makeUIView(context: Context) -> WKWebView { browser.view }
    func updateUIView(_ view: WKWebView, context: Context) {}
}
