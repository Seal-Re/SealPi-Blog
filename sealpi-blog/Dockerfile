FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app

COPY pom.xml ./pom.xml
COPY blog-client/pom.xml ./blog-client/pom.xml
COPY blog-domain/pom.xml ./blog-domain/pom.xml
COPY blog-infra/pom.xml ./blog-infra/pom.xml
COPY blog-app/pom.xml ./blog-app/pom.xml
COPY blog-adapter/pom.xml ./blog-adapter/pom.xml
COPY blog-start/pom.xml ./blog-start/pom.xml

RUN mvn -q -DskipTests dependency:go-offline

COPY . .
RUN mvn -q -DskipTests package

# JDK (not JRE) so jstat / jcmd / jmap are available for production observability.
# Cost: image ~+300MB. Justification: GC sampling without redeploy is operationally
# valuable; the alternative (debug image swap during incidents) is risky.
FROM eclipse-temurin:21-jdk
WORKDIR /app

ENV TZ=Asia/Shanghai
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/blog-start/target/*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java","-Duser.timezone=Asia/Shanghai","-jar","/app/app.jar"]