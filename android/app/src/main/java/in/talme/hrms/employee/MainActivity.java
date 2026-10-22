package in.talme.hrms.employee;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(EmployeeSessionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
