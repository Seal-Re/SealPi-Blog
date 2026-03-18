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

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=builder /app/blog-start/target/*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]