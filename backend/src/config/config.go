package config

import (
	"log"

	"github.com/spf13/viper"
)

type Env struct {
	DbStr string `mapstructure:"DB_STR"`
}

func NewEnv() *Env {
	env := Env{}
	viper.SetConfigFile(".env")

	err := viper.ReadInConfig()
	if err != nil {
		log.Fatalf("Error reading config file: %v", err)
	}

	err = viper.Unmarshal(&env)
	if err != nil {
		log.Fatalf("Error unmarshalling config: %v", err)
	}
	return &env
}

