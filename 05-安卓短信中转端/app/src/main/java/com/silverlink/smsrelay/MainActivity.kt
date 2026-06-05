package com.silverlink.smsrelay

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.databinding.ActivityMainBinding
import com.silverlink.smsrelay.service.RelayServiceLauncher
import com.silverlink.smsrelay.ui.overview.OverviewFragment
import com.silverlink.smsrelay.ui.records.RecordsFragment
import com.silverlink.smsrelay.ui.settings.SettingsFragment
import com.silverlink.smsrelay.util.SmsPermissionHelper

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val overviewFragment by lazy { OverviewFragment() }
    private val recordsFragment by lazy { RecordsFragment() }
    private val settingsFragment by lazy { SettingsFragment() }

    private var activeFragment: Fragment = overviewFragment
    private val smsPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        val granted = result.values.all { it }
        Toast.makeText(
            this,
            if (granted) getString(R.string.sms_permission_granted) else getString(R.string.sms_permission_denied),
            Toast.LENGTH_SHORT,
        ).show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupFragments()
        setupBottomNavigation()
        handleExternalCommands(intent)
        serviceStarter?.invoke(this, false) ?: RelayServiceLauncher.start(this, immediateHeartbeat = false)
        ensureSmsPermissions()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleExternalCommands(intent)
    }

    private fun setupFragments() {
        supportFragmentManager.beginTransaction().apply {
            add(R.id.nav_host_fragment, settingsFragment, "settings").hide(settingsFragment)
            add(R.id.nav_host_fragment, recordsFragment, "records").hide(recordsFragment)
            add(R.id.nav_host_fragment, overviewFragment, "overview")
        }.commit()
        activeFragment = overviewFragment
    }

    private fun setupBottomNavigation() {
        binding.bottomNavigation.setOnItemSelectedListener { item ->
            val target = when (item.itemId) {
                R.id.nav_overview -> overviewFragment
                R.id.nav_records -> recordsFragment
                R.id.nav_settings -> settingsFragment
                else -> overviewFragment
            }
            switchFragment(target)
            true
        }
    }

    private fun switchFragment(target: Fragment) {
        if (target == activeFragment) return
        supportFragmentManager.beginTransaction().apply {
            hide(activeFragment)
            show(target)
        }.commit()
        activeFragment = target
    }

    private fun ensureSmsPermissions() {
        val hasPermissions = smsPermissionChecker?.invoke(this) ?: SmsPermissionHelper.hasSmsPermissions(this)
        if (hasPermissions) return
        permissionRequester?.invoke(this, SmsPermissionHelper.smsPermissions)
            ?: smsPermissionLauncher.launch(SmsPermissionHelper.smsPermissions)
    }

    private fun handleExternalCommands(intent: android.content.Intent?) {
        if (intent == null) return
        if (intent.hasExtra(EXTRA_MEDIA_KEEPALIVE_ENABLED)) {
            val enabled = intent.getBooleanExtra(EXTRA_MEDIA_KEEPALIVE_ENABLED, false)
            RelayPreferences(this).saveMediaKeepAliveEnabled(enabled)
            RelayServiceLauncher.setMediaKeepAlive(this, enabled)
            Toast.makeText(
                this,
                if (enabled) getString(R.string.media_keepalive_enabled) else getString(R.string.media_keepalive_disabled),
                Toast.LENGTH_SHORT,
            ).show()
        }
        if (intent.getBooleanExtra(EXTRA_OPEN_SETTINGS, false)) {
            binding.bottomNavigation.selectedItemId = R.id.nav_settings
        }
    }

    companion object {
        const val EXTRA_MEDIA_KEEPALIVE_ENABLED = "extra_media_keepalive_enabled"
        const val EXTRA_OPEN_SETTINGS = "extra_open_settings"
        internal var serviceStarter: ((MainActivity, Boolean) -> Unit)? = null
        internal var smsPermissionChecker: ((MainActivity) -> Boolean)? = null
        internal var permissionRequester: ((MainActivity, Array<String>) -> Unit)? = null

        internal fun resetTestHooks() {
            serviceStarter = null
            smsPermissionChecker = null
            permissionRequester = null
        }
    }
}
