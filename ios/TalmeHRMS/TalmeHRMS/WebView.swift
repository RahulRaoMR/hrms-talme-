import SwiftUI
import WebKit
import UIKit

struct WebView: UIViewRepresentable {
    @ObservedObject var model: WebViewModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.customUserAgent = "TalmeHRMS-iOS/1.0 WKWebView"

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(context.coordinator, action: #selector(Coordinator.refreshControlChanged(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl
        context.coordinator.refreshControl = refreshControl

        model.attach(webView)
        model.loadHome()

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        model.updateState(from: webView)
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        coordinator.model.detach(webView)
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let model: WebViewModel
        weak var refreshControl: UIRefreshControl?

        init(model: WebViewModel) {
            self.model = model
        }

        @objc func refreshControlChanged(_ sender: UIRefreshControl) {
            model.reload()
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.errorMessage = nil
            model.markLoading(true)
            model.updateState(from: webView)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            refreshControl?.endRefreshing()
            model.markLoading(false)
            model.updateState(from: webView)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            refreshControl?.endRefreshing()
            model.recordError(error)
            model.updateState(from: webView)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            refreshControl?.endRefreshing()
            model.recordError(error)
            model.updateState(from: webView)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if model.shouldDownload(url) {
                model.downloadAndShare(url)
                decisionHandler(.cancel)
                return
            }

            if model.shouldStayInApp(url) {
                decisionHandler(.allow)
                return
            }

            model.openExternal(url)
            decisionHandler(.cancel)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationResponse: WKNavigationResponse,
            decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
        ) {
            guard let url = navigationResponse.response.url else {
                decisionHandler(.allow)
                return
            }

            let mimeType = navigationResponse.response.mimeType?.lowercased() ?? ""
            let isDocument = mimeType.contains("pdf") || mimeType.contains("csv") || mimeType.contains("spreadsheet")

            if isDocument {
                model.downloadAndShare(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if let url = navigationAction.request.url {
                if model.shouldStayInApp(url) {
                    webView.load(URLRequest(url: url))
                } else {
                    model.openExternal(url)
                }
            }
            return nil
        }
    }
}
