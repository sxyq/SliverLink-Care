package com.silverlink.care.infrastructure.persistence;

import org.springframework.stereotype.Component;

@Component
public class DataScopeInterceptor {
    // Demo 阶段使用内存存储，数据范围拦截暂不生效
    // 正式版对接 MyBatis-Plus 后将实现数据范围过滤
}
