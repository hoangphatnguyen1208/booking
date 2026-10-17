package config

import (
	"github.com/spf13/viper"
	"log"
	"os"
)

type Env struct {
	DbStr          string `mapstructure:"DB_STR"`
	JwtSecret      string `mapstructure:"JWT_SECRET"`
	JwtExpiresTime int    `mapstructure:"JWT_EXPIRE_TIME"`
	ServerAddr     string `mapstructure:"SERVER_ADDR"`
}

func NewEnv() *Env {
	v := viper.New()
	v.SetConfigFile(".env")
	v.SetDefault("JWT_EXPIRE_TIME", 3600)
	v.SetDefault("SERVER_ADDR", ":8080")
	for _, key := range []string{"DB_STR", "JWT_SECRET", "JWT_EXPIRE_TIME", "SERVER_ADDR"} {
		if err := v.BindEnv(key); err != nil {
			log.Fatal("Cannot bind configuration")
		}
	}
	if err := v.ReadInConfig(); err != nil && !os.IsNotExist(err) {
		log.Fatal("Cannot read configuration")
	}
	var env Env
	if err := v.Unmarshal(&env); err != nil {
		log.Fatal("Invalid configuration")
	}
	if env.DbStr == "" || len(env.JwtSecret) < 32 || env.JwtExpiresTime < 60 || env.JwtExpiresTime > 86400 {
		log.Fatal("DB_STR, JWT_SECRET (32+ characters), and JWT_EXPIRE_TIME (60-86400) are required")
	}
	return &env
}
