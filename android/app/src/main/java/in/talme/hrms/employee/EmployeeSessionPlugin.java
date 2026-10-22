package in.talme.hrms.employee;

import android.net.Uri;
import android.content.pm.ApplicationInfo;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "EmployeeSession")
public class EmployeeSessionPlugin extends Plugin {
    private static final String KEY_ALIAS = "talme.employee.session.v1";
    private interface Operation { void run() throws Exception; }

    private AtomicFile vault() {
        // Excluded from Android cloud backup and device transfer by design.
        return new AtomicFile(new File(getContext().getNoBackupFilesDir(), "employee-session.enc"));
    }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(KEY_ALIAS)) return (SecretKey) store.getKey(KEY_ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256).setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }

    private void trusted(PluginCall call, Operation operation) {
        getActivity().runOnUiThread(() -> {
            Uri uri = Uri.parse(getBridge().getWebView().getUrl() == null ? "" : getBridge().getWebView().getUrl());
            String host = uri.getHost();
            boolean production = "https".equals(uri.getScheme()) && ("hrms.talme.in".equals(host) || "www.hrms.talme.in".equals(host) || "hrms-talme.vercel.app".equals(host));
            boolean development = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0 && ("10.0.2.2".equals(host) || "localhost".equals(host) || "127.0.0.1".equals(host));
            if (!production && !development) { call.reject("Employee session storage is unavailable on this page."); return; }
            getBridge().execute(() -> {
                try { operation.run(); }
                catch (Exception error) { call.reject("Unable to access secure employee session storage."); }
            });
        });
    }

    @PluginMethod
    public void read(PluginCall call) {
        trusted(call, () -> {
            JSObject result = new JSObject();
            if (!vault().getBaseFile().exists()) { result.put("credential", ""); call.resolve(result); return; }
            try {
                String[] parts = new String(vault().readFully(), StandardCharsets.UTF_8).split(":");
                if (parts.length != 3 || !"1".equals(parts[0])) throw new IllegalStateException();
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[1], Base64.NO_WRAP)));
                result.put("credential", new String(cipher.doFinal(Base64.decode(parts[2], Base64.NO_WRAP)), StandardCharsets.UTF_8));
            } catch (Exception unavailableKey) {
                vault().delete();
                result.put("credential", "");
            }
            call.resolve(result);
        });
    }

    @PluginMethod
    public void write(PluginCall call) {
        trusted(call, () -> {
            String value = call.getString("credential", "");
            if (value.length() > 4096 || value.isEmpty()) { call.reject("Invalid employee session credential."); return; }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key());
            String encrypted = "1:" + Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            AtomicFile file = vault();
            FileOutputStream output = file.startWrite();
            try { output.write(encrypted.getBytes(StandardCharsets.UTF_8)); file.finishWrite(output); }
            catch (Exception error) { file.failWrite(output); throw error; }
            call.resolve();
        });
    }

    @PluginMethod
    public void clear(PluginCall call) {
        trusted(call, () -> { vault().delete(); call.resolve(); });
    }
}
