import React, { useEffect, useState } from "react"
import { Col, Input, Label, Row, Spinner } from "reactstrap"
import { toast } from "react-toastify"
import { useForm, Controller } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import { useAuth } from "../../hooks/useAuth"
import apiHelper from "../../helpers/api-helper"
import { userService } from "../../services/user-service"

const schema = yup
  .object({
    username: yup.string(),
    HoTen: yup.string().nullable(),
    Email: yup
      .string()
      .required("Email là bắt buộc")
      .matches("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$", "Email không hợp lệ"),
    DienThoai: yup.string().nullable()
  })
  .required()

const defaultValues = {
  username: "",
  HoTen: null,
  Email: "",
  DienThoai: null
}

const ProfileDetail = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
    setValue,
    register
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultValues
  })

  const onSubmit = async (data) => {
    console.log(data)
    setIsLoading(true)
    try {
      await userService.editProfile(data)
      toast.success("Cập nhật thông tin thành công")
      // reset(defaultValues)
    } catch (error) {
      console.log("error: ", error)
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    reset(user)
  }, [user])

  return (
    <>
      <Row className="g-2">
        <Col lg={6}>
          <div>
            <Label htmlFor="username-field" className="form-label">
              Tên đăng nhập
            </Label>
            <Controller
              name="username"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Input
                  type="text"
                  id="username-field"
                  className="form-control"
                  onChange={onChange}
                  value={value || ""}
                  disabled
                />
              )}
            />
          </div>
        </Col>
        <Col lg={6}>
          <div>
            <Label htmlFor="HoTen-field" className="form-label">
              Họ và tên
            </Label>
            <Controller
              name="HoTen"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Input
                  type="text"
                  id="HoTen-field"
                  className="form-control"
                  placeholder="Nhập họ và tên"
                  onChange={onChange}
                  value={value || ""}
                  invalid={!!errors.HoTen}
                />
              )}
            />
            {errors.HoTen && <div className="invalid-feedback">{errors.HoTen.message}</div>}
          </div>
        </Col>
        <Col lg={6}>
          <div>
            <Label htmlFor="Email-field" className="form-label">
              Địa chỉ email
            </Label>
            <Controller
              name="Email"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Input
                  type="text"
                  id="Email-field"
                  className="form-control"
                  placeholder="Nhập địa chỉ email"
                  onChange={onChange}
                  value={value || ""}
                  invalid={!!errors.Email}
                />
              )}
            />
            {errors.Email && <div className="invalid-feedback">{errors.Email.message}</div>}
          </div>
        </Col>
        <Col lg={6}>
          <div>
            <Label htmlFor="DienThoai-field" className="form-label">
              Số điện thoại
            </Label>
            <Controller
              name="DienThoai"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Input
                  type="text"
                  id="DienThoai-field"
                  className="form-control"
                  placeholder="Nhập số điện thoại"
                  onChange={onChange}
                  value={value || ""}
                  invalid={!!errors.DienThoai}
                />
              )}
            />
            {errors.DienThoai && <div className="invalid-feedback">{errors.DienThoai.message}</div>}
          </div>
        </Col>
        <Col lg={12}>
          <div className="text-end">
            <button type="button" className="btn btn-primary" onClick={handleSubmit(onSubmit)} disabled={isLoading}>
              <span className="d-flex align-items-center g-2">
                {isLoading ? <Spinner size="sm" className="flex-shrink-0" /> : ""} Cập nhật
              </span>
            </button>
          </div>
        </Col>
      </Row>
    </>
  )
}

export default ProfileDetail
