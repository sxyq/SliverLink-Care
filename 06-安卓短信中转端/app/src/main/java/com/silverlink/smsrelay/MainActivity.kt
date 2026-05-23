package com.silverlink.smsrelay

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.silverlink.smsrelay.databinding.ActivityMainBinding
import com.silverlink.smsrelay.ui.overview.OverviewFragment
import com.silverlink.smsrelay.ui.records.RecordsFragment
import com.silverlink.smsrelay.ui.settings.SettingsFragment

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val overviewFragment by lazy { OverviewFragment() }
    private val recordsFragment by lazy { RecordsFragment() }
    private val settingsFragment by lazy { SettingsFragment() }

    private var activeFragment: Fragment = overviewFragment

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupFragments()
        setupBottomNavigation()
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
}
