import Foundation
import WebKit
import UIKit

struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

final class WebViewModel: NSObject, ObservableObject {
    static let homeURL = URL(string: "https://hrms.talme.in")!
    static let allowedHost = "hrms.talme.in"

    @Published var isLoading = true
    @Published var progress = 0.0
    @Published var errorMessage: String?
    @Published var currentURL: URL?
    @Published var canGoBack = false
    @Published var canGoForward = false
    @Published var shareItem: ShareItem?

    weak var webView: WKWebView?

    func attach(_ webView: WKWebView) {
        self.webView = webView
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.canGoBack), options: .new, context: nil)
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.canGoForward), options: .new, context: nil)
    }

    func detach(_ webView: WKWebView) {
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.canGoBack))
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.canGoForward))
    }

    func loadHome() {
        load(Self.homeURL)
    }

    func load(_ url: URL) {
        guard url.scheme == "https" else { return }
        errorMessage = nil
        var request = URLRequest(url: url)
        request.cachePolicy = .returnCacheDataElseLoad
        webView?.load(request)
    }

    func reload() {
        errorMessage = nil
        if webView?.url == nil {
            loadHome()
        } else {
            webView?.reload()
        }
    }

    func goBack() {
        webView?.goBack()
    }

    func goForward() {
        webView?.goForward()
    }

    func markLoading(_ loading: Bool) {
        isLoading = loading
        if !loading {
            progress = 1
        }
    }

    func updateState(from webView: WKWebView) {
        currentURL = webView.url
        canGoBack = webView.canGoBack
        canGoForward = webView.canGoForward
    }

    func recordError(_ error: Error) {
        isLoading = false
        errorMessage = error.localizedDescription
    }

    func openExternal(_ url: URL) {
        UIApplication.shared.open(url)
    }

    func shouldStayInApp(_ url: URL) -> Bool {
        guard url.scheme == "https", let host = url.host?.lowercased() else {
            return false
        }
        return host == Self.allowedHost
    }

    func shouldDownload(_ url: URL) -> Bool {
        let downloadableExtensions = ["pdf", "csv", "xls", "xlsx", "doc", "docx", "zip"]
        return downloadableExtensions.contains(url.pathExtension.lowercased())
    }

    func downloadAndShare(_ url: URL) {
        Task {
            do {
                var request = URLRequest(url: url)
                let cookies = await cookiesHeader()
                if !cookies.isEmpty {
                    request.setValue(cookies, forHTTPHeaderField: "Cookie")
                }

                let (temporaryURL, response) = try await URLSession.shared.download(for: request)
                let suggestedName = response.suggestedFilename ?? url.lastPathComponent
                let destinationURL = FileManager.default.temporaryDirectory.appendingPathComponent(suggestedName)

                if FileManager.default.fileExists(atPath: destinationURL.path) {
                    try FileManager.default.removeItem(at: destinationURL)
                }
                try FileManager.default.moveItem(at: temporaryURL, to: destinationURL)

                await MainActor.run {
                    shareItem = ShareItem(url: destinationURL)
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Unable to download this file. Please try again."
                }
            }
        }
    }

    private func cookiesHeader() async -> String {
        guard let store = webView?.configuration.websiteDataStore.httpCookieStore else {
            return ""
        }

        return await withCheckedContinuation { continuation in
            store.getAllCookies { cookies in
                let value = cookies
                    .filter { $0.domain.contains(Self.allowedHost) }
                    .map { "\($0.name)=\($0.value)" }
                    .joined(separator: "; ")
                continuation.resume(returning: value)
            }
        }
    }

    override func observeValue(
        forKeyPath keyPath: String?,
        of object: Any?,
        change: [NSKeyValueChangeKey: Any]?,
        context: UnsafeMutableRawPointer?
    ) {
        guard let webView = object as? WKWebView else { return }

        Task { @MainActor in
            if keyPath == #keyPath(WKWebView.estimatedProgress) {
                progress = webView.estimatedProgress
            }
            updateState(from: webView)
        }
    }
}
