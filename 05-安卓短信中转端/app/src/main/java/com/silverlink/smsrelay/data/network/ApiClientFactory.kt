package com.silverlink.smsrelay.data.network

import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

object ApiClientFactory {

    fun create(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .build()
    }
}
